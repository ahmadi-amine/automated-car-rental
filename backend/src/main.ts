import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // strip unknown fields
      forbidNonWhitelisted: true, // throw on unknown fields
      transform: true,       // auto-transform payloads to DTO instances
    }),
  );

  app.setGlobalPrefix('api');
  // Restrict CORS to configured origins in production (comma-separated CORS_ORIGIN).
  // Falls back to permissive when unset, for local development convenience.
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;
  app.enableCors({ origin: corsOrigin, credentials: true });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
