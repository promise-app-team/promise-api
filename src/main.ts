import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const PORT = config.get('PORT') || 8080;
  await app.listen(PORT, '0.0.0.0');

  Logger.log(`Server running on ${await app.getUrl()}`, 'Bootstrap');
}

bootstrap();
