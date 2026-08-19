import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';

/**
 * Word-count chunking rather than a tokenizer.
 *
 * A real tokenizer would match the embedding model's token boundaries
 * exactly, but it means shipping (or downloading) the model's vocabulary
 * file just to cut text into pieces. Word count is a close enough proxy for
 * token count in English prose — roughly 0.75 tokens per word — and it keeps
 * this service dependency-free. The chunk/overlap sizes in configuration.ts
 * already account for the approximation with margin.
 */
@Injectable()
export class ChunkingService {
  private readonly chunkWords: number;
  private readonly overlapWords: number;

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    const { chunkWords, overlapWords } = configService.get('app', {
      infer: true,
    }).chunking;
    if (overlapWords >= chunkWords) {
      throw new Error('CHUNK_OVERLAP_WORDS must be smaller than CHUNK_WORDS');
    }
    this.chunkWords = chunkWords;
    this.overlapWords = overlapWords;
  }

  chunk(text: string): string[] {
    const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (words.length === 0) return [];

    const step = this.chunkWords - this.overlapWords;
    const chunks: string[] = [];

    for (let start = 0; start < words.length; start += step) {
      const slice = words.slice(start, start + this.chunkWords);
      if (slice.length === 0) break;
      chunks.push(slice.join(' '));
      // A final chunk shorter than the overlap would otherwise duplicate
      // the previous one almost entirely — stop once the window can't
      // advance past what's already covered.
      if (start + this.chunkWords >= words.length) break;
    }

    return chunks;
  }
}
