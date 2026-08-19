import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';

export interface EmbeddingResult {
  vector: number[];
}

export interface GenerationChunk {
  text: string;
  done: boolean;
}

/**
 * Thin HTTP client over Ollama's native API (not the OpenAI-compatible
 * shim) — the native `/api/generate` endpoint's streamed NDJSON gives a
 * `done` flag and per-request timing fields the OpenAI-compatible endpoint
 * does not, and the query pipeline's latency counter depends on them.
 */
@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly config: AppConfig['ollama'];

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    this.config = configService.get('app', { infer: true }).ollama;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const res = await this.request('/api/embeddings', {
      model: this.config.embeddingModel,
      prompt: text,
    });

    const body = (await res.json()) as { embedding?: number[] };
    if (!body.embedding) {
      throw new ServiceUnavailableException(
        'Ollama returned no embedding vector',
      );
    }
    return { vector: body.embedding };
  }

  /**
   * Embeds many chunks sequentially rather than with Promise.all.
   *
   * Ollama serves one model at a time per GPU/CPU slot on a modest VPS —
   * firing N embedding requests concurrently does not parallelise the work,
   * it just queues them inside Ollama while N HTTP requests sit open on this
   * process. Sequential calls make the queuing explicit instead of hidden,
   * and keep ingestion of one document from starving inference for another
   * visitor's query running at the same time.
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  /**
   * Streams generation token-by-token as an async generator so the query
   * service can forward chunks to an SSE response as they arrive, rather
   * than buffering the full answer before the visitor sees anything.
   */
  async *generateStream(prompt: string): AsyncGenerator<GenerationChunk> {
    const res = await this.request('/api/generate', {
      model: this.config.generationModel,
      prompt,
      stream: true,
    });

    if (!res.body) {
      throw new ServiceUnavailableException(
        'Ollama returned no response stream',
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // The last element may be a partial line — keep it in the buffer for
        // the next chunk rather than parsing a truncated JSON object.
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line) as {
            response?: string;
            done?: boolean;
          };
          yield { text: parsed.response ?? '', done: parsed.done ?? false };
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async request(path: string, body: unknown): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(
        `Ollama request to ${path} failed: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'The local model is unreachable right now — it may be cold-starting. Try again in a few seconds.',
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Ollama ${path} returned ${res.status}: ${text}`);
      throw new ServiceUnavailableException(
        'The local model returned an error. It may still be loading — try again shortly.',
      );
    }

    return res;
  }
}
