import { memoryStorage } from 'multer';
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequireScopes } from '../auth/scopes.decorator';
import { DocumentsService } from './documents.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { ScenarioCatalogDto } from './dto/scenario-catalog.dto';
import { ScenarioKey } from './scenarios';

/**
 * `memoryStorage()`, not disk storage — see the note on PdfExtractionService.
 * The multer-level size cap here (20MB) is a coarse backstop against a
 * client sending an enormous body before any of our own code runs;
 * DocumentsService enforces the real, configurable limit and returns a
 * clearer error once the file is actually in memory.
 */
const upload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  /**
   * The one endpoint in this service that makes the server keep something.
   *
   * An upload costs disk, an embedding pass, and a slot in an inference
   * queue shared with the other two demos on a single VPS — so it is the
   * one action gated behind a verified account. `demo:write` is absent from
   * the shared demo account's token, which is what lets the front door stay
   * open to anyone without also opening the disk to anyone.
   *
   * Deliberately NOT applied to the query endpoints: a demo visitor must
   * still be able to ask questions against the pre-indexed corpus, or this
   * stops being a demo and becomes a signup wall with extra steps.
   */
  @Post()
  @RequireScopes('demo:write')
  @UseInterceptors(upload)
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded — field name must be "file".',
      );
    }
    return this.documents.ingestPdf(file);
  }

  /**
   * The 3 seeded scenario documents, with full text and suggested
   * questions — readable before any ingestion happens, so the picker and
   * preview modal have something to show before a visitor commits to one.
   */
  @Get('scenarios')
  async scenarios(): Promise<ScenarioCatalogDto[]> {
    return this.documents.getScenarioCatalog();
  }

  /**
   * Ingests one of the bundled scenario documents. Left open to the demo
   * account on purpose — these are fixed, known files rather than
   * visitor-supplied bytes, so each costs one bounded ingestion and
   * nothing unbounded.
   */
  @Post('scenario/:key')
  async scenario(
    @Param('key') key: string,
  ): Promise<DocumentResponseDto> {
    return this.documents.ingestScenario(key as ScenarioKey);
  }
}
