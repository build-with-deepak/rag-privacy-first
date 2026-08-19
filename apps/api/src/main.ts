import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<{ app: AppConfig }, true>);
  const config = configService.get('app', { infer: true });

  app.enableCors({ origin: config.corsOrigin });

  // `whitelist` strips unknown fields instead of erroring on them —
  // friendlier for a public demo endpoint than rejecting a client that
  // sends one extra query param. `transform` is what lets class-validator
  // decorators run against `@Query()` DTOs at all.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(config.port);
  Logger.log(
    `rag-privacy-first API listening on port ${config.port}`,
    'Bootstrap',
  );
}

bootstrap().catch((err: Error) => {
  Logger.error(`Failed to start: ${err.message}`, err.stack, 'Bootstrap');
  process.exit(1);
});
