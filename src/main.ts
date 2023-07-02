import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app/app.module';
import { Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

const PORT = process.env.PORT || 8080;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  await app.listen(PORT, '0.0.0.0');

  Logger.log(`Server running on ${await app.getUrl()}`, 'Bootstrap');
}
bootstrap();
