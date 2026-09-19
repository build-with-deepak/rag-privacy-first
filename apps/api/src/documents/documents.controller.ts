import { memoryStorage } from 'multer';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequireScopes } from '../auth/scopes.decorator';
import { DocumentsService } from './documents.service';
import { DocumentResponseDto } from './dto/document-response.dto';

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
   * Ingests the bundled sample document. Left open to the demo account on
   * purpose — it is a fixed, known file rather than visitor-supplied bytes,
   * so it costs one bounded ingestion and nothing unbounded.
   */
  @Post('sample')
  async sample(): Promise<DocumentResponseDto> {
    return this.documents.ingestSample();
  }
}
