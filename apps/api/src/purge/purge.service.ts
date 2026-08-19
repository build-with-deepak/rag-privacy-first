import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DocumentsService } from '../documents/documents.service';
import { QdrantService } from '../qdrant/qdrant.service';

/**
 * Enforces the "auto-purge after 1 hour" guarantee stated on the page.
 *
 * Runs every 5 minutes rather than exactly on each document's own TTL —
 * five minutes of slack is invisible to a visitor and means one scheduled
 * job handles every document instead of one timer per upload, which would
 * leak if a process restart dropped the timers but not the vectors.
 */
@Injectable()
export class PurgeService implements OnModuleInit {
  private readonly logger = new Logger(PurgeService.name);

  constructor(
    private readonly documents: DocumentsService,
    private readonly qdrant: QdrantService,
  ) {}

  onModuleInit(): void {
    this.logger.log(
      'Purge job scheduled — expired documents are removed every 5 minutes.',
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async purgeExpired(): Promise<void> {
    const now = Date.now();
    const removedFromRegistry = this.documents.removeExpired(now);

    if (removedFromRegistry.length === 0) return;

    try {
      await this.qdrant.deleteExpired(now);
      this.logger.log(
        `Purged ${removedFromRegistry.length} expired document(s): ${removedFromRegistry.join(', ')}`,
      );
    } catch (err) {
      this.logger.error(
        `Vector purge failed, will retry next cycle: ${(err as Error).message}`,
      );
    }
  }
}
