import { Module } from '@nestjs/common';
import { PurgeService } from './purge.service';
import { DocumentsModule } from '../documents/documents.module';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [DocumentsModule, QdrantModule],
  providers: [PurgeService],
})
export class PurgeModule {}
