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
import { ScenarioCatalogDto } from './dto/scenario-catalog.dto';
import { SCENARIOS, ScenarioKey, getScenario } from './scenarios';

interface DocumentRecord {
  documentId: string;
  originalName: string;
  createdAt: number;
  expiresAt: number;
  chunkCount: number;
  scenarioKey?: ScenarioKey;
  scenarioDescription?: string;
}

/**
 * The seeded scenario documents are this repo's own content, not a
 * visitor's upload — the 1-hour privacy guarantee on the page is about
 * user data, not about these fixtures. They still get a bound (24h)
 * rather than living forever, so an unattended demo doesn't accumulate an
 * ever-larger "permanent" exception to its own purge policy.
 */
const SCENARIO_TTL_MS = 24 * 60 * 60 * 1000;

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
  /** Independent in-flight dedup per scenario — 3 scenarios can be
   * ingested concurrently by different visitors without sharing one slot. */
  private readonly scenarioPromises = new Map<
    ScenarioKey,
    Promise<DocumentResponseDto>
  >();
  /** The 3 asset files never change at runtime, so read them once. */
  private scenarioTextCache: Map<ScenarioKey, string> | null = null;

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

  /** Idempotent within the scenario's TTL — re-ingesting the same file wastes embedding calls. */
  async ingestScenario(key: ScenarioKey): Promise<DocumentResponseDto> {
    const scenario = getScenario(key);
    if (!scenario) {
      throw new NotFoundException(`Unknown scenario "${key}".`);
    }

    const existing = this.registry.get(scenario.documentId);
    if (existing && existing.expiresAt > Date.now()) {
      return this.toDto(existing);
    }

    // Concurrent first requests for the same scenario must not each kick
    // off their own ingestion — the promise is cached so every caller
    // awaits the same in-flight work. Independent per scenario key.
    let promise = this.scenarioPromises.get(key);
    if (!promise) {
      promise = this.loadScenarioText(key)
        .then((text) =>
          this.ingestText(
            scenario.documentId,
            text,
            scenario.name,
            SCENARIO_TTL_MS,
            key,
            scenario.description,
          ),
        )
        .finally(() => {
          this.scenarioPromises.delete(key);
        });
      this.scenarioPromises.set(key, promise);
    }
    return promise;
  }

  /**
   * The picker and preview modal need the scenarios' names, descriptions,
   * suggested questions and full text before any embedding happens — this
   * reads the asset files only, no Ollama/Qdrant call, so it's cheap
   * enough to hit on every page load.
   */
  async getScenarioCatalog(): Promise<ScenarioCatalogDto[]> {
    return Promise.all(
      SCENARIOS.map(async (scenario) => ({
        key: scenario.key,
        name: scenario.name,
        description: scenario.description,
        suggestedQuestions: scenario.suggestedQuestions,
        text: await this.loadScenarioText(scenario.key),
      })),
    );
  }

  private async loadScenarioText(key: ScenarioKey): Promise<string> {
    this.scenarioTextCache ??= new Map();
    const cached = this.scenarioTextCache.get(key);
    if (cached !== undefined) return cached;

    const scenario = getScenario(key);
    if (!scenario) {
      throw new NotFoundException(`Unknown scenario "${key}".`);
    }
    const text = await readFile(
      join(__dirname, '..', '..', 'assets', scenario.assetFile),
      'utf-8',
    );
    this.scenarioTextCache.set(key, text);
    return text;
  }

  assertExists(documentId: string): void {
    const record = this.registry.get(documentId);
    if (!record || record.expiresAt <= Date.now()) {
      throw new NotFoundException(
        'This document has expired or was never uploaded. Upload a PDF or pick a scenario again.',
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
    scenarioKey?: ScenarioKey,
    scenarioDescription?: string,
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
      scenarioKey,
      scenarioDescription,
    };
    this.registry.set(documentId, record);

    return this.toDto(record);
  }

  private toDto(record: DocumentRecord): DocumentResponseDto {
    return {
      documentId: record.documentId,
      chunkCount: record.chunkCount,
      originalName: record.originalName,
      expiresAt: new Date(record.expiresAt).toISOString(),
      scenarioKey: record.scenarioKey,
      description: record.scenarioDescription,
    };
  }
}
