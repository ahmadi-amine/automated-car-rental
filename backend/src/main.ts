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
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
