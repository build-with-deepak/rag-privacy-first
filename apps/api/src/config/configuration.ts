/**
 * Single source of runtime config, read once at boot. Every other module gets
 * these values through Nest's ConfigService rather than reading process.env
 * directly, so there is one place to see what this service actually depends
 * on to run.
 */
export interface AppConfig {
  port: number;
  corsOrigin: string;
  auth: {
    jwtSecret: string;
    /** Demo sessions are short-lived by design. */
    tokenTtl: string;
  };
  ollama: {
    baseUrl: string;
    embeddingModel: string;
    generationModel: string;
  };
  qdrant: {
    url: string;
    apiKey?: string;
    collection: string;
  };
  upload: {
    maxSizeBytes: number;
    ttlMs: number;
  };
  chunking: {
    /**
     * ~220 words per chunk. nomic-embed-text's useful context is a few
     * thousand tokens, but a chunk this size — roughly 300 tokens — keeps
     * each retrieved passage focused on one idea rather than several, which
     * is what makes the similarity score for a single chunk meaningful. A
     * bigger chunk dilutes the embedding across topics the question wasn't
     * about; a much smaller one loses the surrounding sentence a citation
     * needs to make sense out of context.
     */
    chunkWords: number;
    /**
     * ~40 words (roughly a fifth of a chunk). Enough for a sentence that
     * straddles a chunk boundary to appear whole in at least one chunk, so a
     * fact split across the cut point is still retrievable. Much more than
     * this and the index balloons with near-duplicate text for a demo corpus
     * that is, by construction, small.
     */
    overlapWords: number;
  };
  concurrency: {
    /** Hard cap on inference requests running at once. */
    maxConcurrentInference: number;
    /** Requests beyond this many already waiting are rejected outright, not queued indefinitely. */
    maxQueueLength: number;
  };
  rateLimit: {
    ttlMs: number;
    limit: number;
  };
}

const DEV_ONLY_SECRET = 'dev-only-secret-change-me';

export default (): { app: AppConfig } => {
  const jwtSecret = process.env.JWT_SECRET ?? DEV_ONLY_SECRET;
  if (process.env.NODE_ENV === 'production' && jwtSecret === DEV_ONLY_SECRET) {
    // Refusing to boot beats silently signing production sessions with a
    // secret that is committed to a public repository.
    throw new Error('JWT_SECRET must be set in production.');
  }

  return {
    app: {
      port: Number(process.env.PORT ?? 3000),
      corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
      auth: {
        jwtSecret,
        tokenTtl: process.env.DEMO_TOKEN_TTL ?? '2h',
      },
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
        embeddingModel:
          process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text',
        generationModel: process.env.OLLAMA_GENERATION_MODEL ?? 'llama3:8b',
      },
      qdrant: {
        url: process.env.QDRANT_URL ?? 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
        collection: process.env.QDRANT_COLLECTION ?? 'rag_documents',
      },
      upload: {
        maxSizeBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 15 * 1024 * 1024),
        ttlMs: Number(process.env.DOCUMENT_TTL_MS ?? 60 * 60 * 1000),
      },
      chunking: {
        chunkWords: Number(process.env.CHUNK_WORDS ?? 220),
        overlapWords: Number(process.env.CHUNK_OVERLAP_WORDS ?? 40),
      },
      concurrency: {
        maxConcurrentInference: Number(
          process.env.MAX_CONCURRENT_INFERENCE ?? 2,
        ),
        maxQueueLength: Number(process.env.MAX_QUEUE_LENGTH ?? 20),
      },
      rateLimit: {
        ttlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60 * 1000),
        limit: Number(process.env.RATE_LIMIT_LIMIT ?? 10),
      },
    },
  };
};
