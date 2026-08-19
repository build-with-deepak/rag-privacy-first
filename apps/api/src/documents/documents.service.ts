import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';
import { ChunkingService } from './chunking.service';
import { PdfExtractionService } from './pdf-extraction.service';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { DocumentResponseDto } from './dto/document-response.dto';

interface DocumentRecord {
  documentId: string;
  originalName: string;
  createdAt: number;
  expiresAt: number;
  chunkCount: number;
}

/** Fixed ID so repeat visitors hit the same, already-embedded sample. */
const SAMPLE_DOCUMENT_ID = 'sample-document';
/**
 * The sample is this repo's own content, not a visitor's upload — the
 * 1-hour privacy guarantee on the page is about user data, not about the
 * demo fixture. It still gets a bound (24h) rather than living forever, so
 * an unattended demo doesn't accumulate an ever-larger "permanent" exception
 * to its own purge policy.
 */
const SAMPLE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory registry of ingested documents.
 *
 * Deliberately not a database: the source of truth for "does this document's
 * data still exist" is Qdrant, which already stores an `expiresAt` payload
 * per chunk. This registry exists only so the purge job and the query
 * endpoint can answer "is this ID valid" in microseconds instead of a
 * network round trip, and it is rebuilt fresh on every process restart —
 * fine, because a restart also means Ollama/Qdrant state should be
 * re-verified anyway.
 */
@Injectable()
export class DocumentsService {
  private readonly registry = new Map<string, DocumentRecord>();
  private readonly ttlMs: number;
  private readonly maxSizeBytes: number;
  private samplePromise: Promise<DocumentResponseDto> | null = null;

  constructor(
    configService: ConfigService<{ app: AppConfig }, true>,
    private readonly pdfExtraction: PdfExtractionService,
    private readonly chunking: ChunkingService,
    private readonly ollama: OllamaService,
    private readonly qdrant: QdrantService,
  ) {
    const upload = configService.get('app', { infer: true }).upload;
    this.ttlMs = upload.ttlMs;
    this.maxSizeBytes = upload.maxSizeBytes;
  }

  async ingestPdf(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }): Promise<DocumentResponseDto> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are accepted.');
    }
    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(
        `File exceeds the ${Math.round(this.maxSizeBytes / (1024 * 1024))}MB limit.`,
      );
    }

    const text = await this.pdfExtraction.extractText(file.buffer);
    return this.ingestText(randomUUID(), text, file.originalname, this.ttlMs);
  }

  /** Idempotent within the sample's TTL — re-ingesting the same file wastes embedding calls. */
  async ingestSample(): Promise<DocumentResponseDto> {
    const existing = this.registry.get(SAMPLE_DOCUMENT_ID);
    if (existing && existing.expiresAt > Date.now()) {
      return this.toDto(existing);
    }

    // Concurrent first requests must not each kick off their own ingestion —
    // the promise is cached so every caller awaits the same in-flight work.
    if (!this.samplePromise) {
      this.samplePromise = readFile(
        join(__dirname, '..', '..', 'assets', 'sample-document.txt'),
        'utf-8',
      )
        .then((text) =>
          this.ingestText(
            SAMPLE_DOCUMENT_ID,
            text,
            'sample-document.txt',
            SAMPLE_TTL_MS,
          ),
        )
        .finally(() => {
          this.samplePromise = null;
        });
    }
    return this.samplePromise;
  }

  assertExists(documentId: string): void {
    const record = this.registry.get(documentId);
    if (!record || record.expiresAt <= Date.now()) {
      throw new NotFoundException(
        'This document has expired or was never uploaded. Upload a PDF or try the sample document again.',
      );
    }
  }

  /** Called by the purge cron. Returns the IDs it removed, for logging. */
  removeExpired(now: number): string[] {
    const removed: string[] = [];
    for (const [id, record] of this.registry) {
      if (record.expiresAt <= now) {
        this.registry.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  private async ingestText(
    documentId: string,
    text: string,
    originalName: string,
    ttlMs: number,
  ): Promise<DocumentResponseDto> {
    const chunks = this.chunking.chunk(text);
    if (chunks.length === 0) {
      throw new BadRequestException(
        'Document contained no usable text after chunking.',
      );
    }

    const now = Date.now();
    const expiresAt = now + ttlMs;
    const embeddings = await this.ollama.embedBatch(chunks);

    await this.qdrant.upsertChunks(
      chunks.map((chunkText, index) => ({
        id: randomUUID(),
        vector: embeddings[index].vector,
        payload: { documentId, chunkIndex: index, text: chunkText, expiresAt },
      })),
    );

    const record: DocumentRecord = {
      documentId,
      originalName,
      createdAt: now,
      expiresAt,
      chunkCount: chunks.length,
    };
    this.registry.set(documentId, record);

    return this.toDto(record);
  }

  private toDto(record: DocumentRecord): DocumentResponseDto {
    return {
      documentId: record.documentId,
      chunkCount: record.chunkCount,
      expiresAt: new Date(record.expiresAt).toISOString(),
    };
  }
}
