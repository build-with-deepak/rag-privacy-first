import { memoryStorage } from 'multer';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post()
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

  @Post('sample')
  async sample(): Promise<DocumentResponseDto> {
    return this.documents.ingestSample();
  }
}
