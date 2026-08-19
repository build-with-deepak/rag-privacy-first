import { Injectable, Logger } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';
import { InferenceQueueService } from '../common/inference-queue.service';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { QueryDto } from './dto/query.dto';
import type { QueryEvent, RetrievedChunk } from './query-events';

/**
 * How many chunks to retrieve per question.
 *
 * Four is enough to answer most single-fact or single-section questions
 * without crowding the prompt with passages the question wasn't about — more
 * than that starts diluting the model's attention across content it has to
 * decide is irrelevant, which shows up as answers that hedge across sources
 * instead of citing the one that actually matters.
 */
const TOP_K = 4;

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    private readonly documents: DocumentsService,
    private readonly ollama: OllamaService,
    private readonly qdrant: QdrantService,
    private readonly queue: InferenceQueueService,
  ) {}

  /**
   * Never throws — every failure path is caught and re-emitted as an
   * `error` SSE event so the HTTP response completes cleanly and the
   * frontend gets a message to render instead of a dropped connection.
   */
  async run(dto: QueryDto, emit: (event: QueryEvent) => void): Promise<void> {
    const wallStart = Date.now();

    try {
      this.documents.assertExists(dto.documentId);
    } catch (err) {
      emit({ type: 'error', data: { message: (err as Error).message } });
      return;
    }

    let release: (() => void) | undefined;
    try {
      release = await this.queue.acquire((position) =>
        emit({ type: 'queue', data: { position } }),
      );
    } catch (err) {
      emit({ type: 'error', data: { message: (err as Error).message } });
      return;
    }

    try {
      const retrievalStart = Date.now();
      const questionVector = await this.ollama.embed(dto.question);
      const scored = await this.qdrant.search(
        questionVector.vector,
        dto.documentId,
        TOP_K,
      );
      const retrievalMs = Date.now() - retrievalStart;

      const chunks: RetrievedChunk[] = scored
        .sort((a, b) => b.score - a.score)
        .map((chunk) => ({
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          score: chunk.score,
        }));

      emit({ type: 'retrieval', data: { chunks, retrievalMs } });

      const generationStart = Date.now();
      const prompt = this.buildPrompt(dto.question, chunks);

      for await (const piece of this.ollama.generateStream(prompt)) {
        if (piece.text) emit({ type: 'token', data: { text: piece.text } });
      }

      const generationMs = Date.now() - generationStart;
      emit({
        type: 'done',
        data: { generationMs, totalMs: Date.now() - wallStart },
      });
    } catch (err) {
      this.logger.error(`Query failed: ${(err as Error).message}`);
      emit({
        type: 'error',
        data: {
          message:
            (err as Error).message ||
            'Something went wrong generating an answer.',
        },
      });
    } finally {
      release?.();
    }
  }

  private buildPrompt(question: string, chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
      return (
        `You are answering a question using ONLY a document, but no relevant passages were found.\n` +
        `Tell the user plainly that the document doesn't appear to contain an answer to this question.\n\n` +
        `Question: ${question}`
      );
    }

    const context = chunks
      .map((chunk, index) => `[${index + 1}] ${chunk.text}`)
      .join('\n\n');

    return (
      `You are answering a question using ONLY the numbered passages below, retrieved from a document. ` +
      `Cite the passage number(s) you used inline, like [1] or [2][3]. ` +
      `If the passages don't contain the answer, say so plainly instead of guessing.\n\n` +
      `Passages:\n${context}\n\n` +
      `Question: ${question}\n\nAnswer:`
    );
  }
}
