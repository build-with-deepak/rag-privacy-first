import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { InferenceQueueService } from '../common/inference-queue.service';
import { DocumentsModule } from '../documents/documents.module';
import { OllamaModule } from '../ollama/ollama.module';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [DocumentsModule, OllamaModule, QdrantModule],
  controllers: [QueryController],
  providers: [QueryService, InferenceQueueService],
})
export class QueryModule {}
