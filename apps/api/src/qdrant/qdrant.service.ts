import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { AppConfig } from '../config/configuration';

/** Vector size for nomic-embed-text — fixed by the embedding model, not configurable. */
const EMBEDDING_DIMENSIONS = 768;

export interface ChunkPayload {
  documentId: string;
  chunkIndex: number;
  text: string;
  /** Epoch ms — the purge job filters on this rather than tracking TTL in a second store. */
  expiresAt: number;
}

export interface ScoredChunk extends ChunkPayload {
  score: number;
}

/**
 * All documents share one Qdrant collection, distinguished by a
 * `documentId` payload field rather than one collection per upload.
 *
 * A collection per document would mean every visitor's PDF creates and
 * eventually tears down its own HNSW index — fine at a handful of demo
 * uploads a day, wasteful the moment usage is real. Filtering a shared
 * collection by payload costs a bit of query overhead per search; recreating
 * a collection costs a write-heavy admin operation per upload. For a
 * single-instance public demo, the shared collection is the one that
 * degrades gracefully under load instead of under document count.
 */
@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private readonly collection: string;

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    const config = configService.get('app', { infer: true }).qdrant;
    this.collection = config.collection;
    this.client = new QdrantClient({ url: config.url, apiKey: config.apiKey });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.collectionExists(this.collection);
      if (!exists.exists) {
        await this.client.createCollection(this.collection, {
          vectors: { size: EMBEDDING_DIMENSIONS, distance: 'Cosine' },
        });
        this.logger.log(`Created Qdrant collection "${this.collection}"`);
      }
    } catch (err) {
      // Non-fatal at boot: Qdrant may still be starting in the same Docker
      // Compose stack. Every subsequent call re-attempts and surfaces a
      // clear error instead of the process crash-looping against a
      // dependency that is seconds away from being ready.
      this.logger.warn(
        `Qdrant not reachable at boot: ${(err as Error).message}`,
      );
    }
  }

  async upsertChunks(
    points: { id: string; vector: number[]; payload: ChunkPayload }[],
  ): Promise<void> {
    await this.withErrorHandling(() =>
      this.client.upsert(this.collection, {
        wait: true,
        // Qdrant's payload type is an open Record<string, unknown> — ChunkPayload
        // is a closed interface, so it needs an explicit widening cast rather
        // than structurally satisfying the client's type as-is.
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload as unknown as Record<string, unknown>,
        })),
      }),
    );
  }

  async search(
    vector: number[],
    documentId: string,
    limit: number,
  ): Promise<ScoredChunk[]> {
    const result = await this.withErrorHandling(() =>
      this.client.query(this.collection, {
        query: vector,
        filter: { must: [{ key: 'documentId', match: { value: documentId } }] },
        limit,
        with_payload: true,
      }),
    );

    return result.points.map((point) => ({
      score: point.score,
      ...(point.payload as unknown as ChunkPayload),
    }));
  }

  async documentExists(documentId: string): Promise<boolean> {
    const result = await this.withErrorHandling(() =>
      this.client.count(this.collection, {
        filter: { must: [{ key: 'documentId', match: { value: documentId } }] },
        exact: false,
      }),
    );
    return result.count > 0;
  }

  /** Deletes every chunk whose expiry has passed — called by the purge cron. */
  async deleteExpired(nowMs: number): Promise<number> {
    const result = await this.withErrorHandling(() =>
      this.client.delete(this.collection, {
        wait: true,
        filter: { must: [{ key: 'expiresAt', range: { lte: nowMs } }] },
      }),
    );
    return result.status === 'completed' ? 1 : 0;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.withErrorHandling(() =>
      this.client.delete(this.collection, {
        wait: true,
        filter: { must: [{ key: 'documentId', match: { value: documentId } }] },
      }),
    );
  }

  private async withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      this.logger.error(`Qdrant operation failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'The vector store is unreachable right now. Try again shortly.',
      );
    }
  }
}
