import { ConfigService } from '@nestjs/config';
import { ChunkingService } from './chunking.service';

function makeService(
  chunkWords: number,
  overlapWords: number,
): ChunkingService {
  const configService = {
    get: () => ({ chunking: { chunkWords, overlapWords } }),
  } as unknown as ConfigService<{ app: unknown }, true>;
  return new ChunkingService(configService);
}

describe('ChunkingService', () => {
  it('throws if overlap is not smaller than chunk size', () => {
    expect(() => makeService(10, 10)).toThrow();
    expect(() => makeService(10, 20)).toThrow();
  });

  it('returns no chunks for empty text', () => {
    const service = makeService(10, 2);
    expect(service.chunk('   ')).toEqual([]);
  });

  it('returns a single chunk when text is shorter than the chunk size', () => {
    const service = makeService(10, 2);
    const text = 'one two three four five';
    const chunks = service.chunk(text);
    expect(chunks).toEqual([text]);
  });

  it('splits long text into overlapping chunks of the configured size', () => {
    const service = makeService(5, 2);
    const words = Array.from({ length: 12 }, (_, i) => `w${i}`);
    const chunks = service.chunk(words.join(' '));

    // step = chunkWords - overlapWords = 3
    // starts: 0, 3, 6, 9 -> slices of up to 5 words each
    expect(chunks).toEqual([
      'w0 w1 w2 w3 w4',
      'w3 w4 w5 w6 w7',
      'w6 w7 w8 w9 w10',
      'w9 w10 w11',
    ]);
  });

  it('every consecutive pair of chunks shares the overlap region', () => {
    const service = makeService(6, 2);
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`);
    const chunks = service.chunk(words.join(' '));

    for (let i = 0; i < chunks.length - 1; i++) {
      const currentWords = chunks[i].split(' ');
      const nextWords = chunks[i + 1].split(' ');
      const overlap = currentWords.slice(-2);
      expect(nextWords.slice(0, 2)).toEqual(overlap);
    }
  });

  it('normalizes internal whitespace before chunking', () => {
    const service = makeService(10, 2);
    const chunks = service.chunk('word1   word2\n\nword3\tword4');
    expect(chunks).toEqual(['word1 word2 word3 word4']);
  });
});
