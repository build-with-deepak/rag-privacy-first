import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration, { AppConfig } from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { DocumentsModule } from './documents/documents.module';
import { HealthController } from './health/health.controller';
import { OllamaModule } from './ollama/ollama.module';
import { PurgeModule } from './purge/purge.module';
import { QdrantModule } from './qdrant/qdrant.module';
import { QueryModule } from './query/query.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    // Global per-IP rate limiting — see configuration.ts for the defaults.
    // This is the outermost guardrail: it protects the upload and query
    // endpoints alike before any request-specific logic runs.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ app: AppConfig }, true>) => {
        const rateLimit = configService.get('app', { infer: true }).rateLimit;
        return {
          throttlers: [{ ttl: rateLimit.ttlMs, limit: rateLimit.limit }],
        };
      },
    }),
    AuthModule,
    OllamaModule,
    QdrantModule,
    DocumentsModule,
    QueryModule,
    PurgeModule,
  ],
  controllers: [HealthController],
  providers: [
    // Throttling before auth: an unauthenticated flood is rejected by the
    // cheaper guard first.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
