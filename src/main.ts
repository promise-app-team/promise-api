import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from '@/app/app.module';
import { ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const PORT = config.get('PORT') || 8080;
  const API_VERSION = config.get('API_VERSION');

  app.useStaticAssets(join(__dirname, '..', 'assets'), { prefix: '/assets' });
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useWebSocketAdapter(new WsAdapter(app));

  const openApiConfig = new DocumentBuilder()
    .setTitle(`Promise API`)
    .setVersion(API_VERSION)
    .addTag('App', 'Entry point of API')
    .addSecurity('bearer', { type: 'http', scheme: 'bearer' })
    .setExternalDoc('OpenAPI Specification (JSON)', `/api-json`)
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api', app, document, {
    customfavIcon: `/assets/favicon.ico`,
    customSiteTitle: 'Promise API',
    customCssUrl: `/assets/css/swagger.css`,
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true,
    },
  });

  await app.listen(PORT, '0.0.0.0');
  Logger.log(`Server running on ${await app.getUrl()}`, 'Bootstrap');
}

bootstrap();
