import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfExtractionService } from './pdf-extraction.service';
import { OllamaModule } from '../ollama/ollama.module';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [OllamaModule, QdrantModule],
  controllers: [DocumentsController],
  providers: [ChunkingService, PdfExtractionService, DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
