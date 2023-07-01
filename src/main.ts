import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app/app.module';
import { Logger } from '@nestjs/common';

const PORT = process.env.PORT || 8080;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(PORT);

  Logger.log(`Server running on ${await app.getUrl()}`, 'Bootstrap');
}
bootstrap();
