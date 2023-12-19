import type { Server } from 'http';
import type { Handler } from 'aws-lambda';

// @ts-expect-error - no types
import { createServer, proxy } from '@vendia/serverless-express';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from '@/app/app.module';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { WsAdapter } from '@nestjs/platform-ws';

let cachedServer: Server;
const binaryMimeTypes: string[] = [];

async function bootstrap(): Promise<Server> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const API_VERSION = config.get('API_VERSION');

  app.useStaticAssets(join(__dirname, '..', 'assets'), {
    prefix: '/assets',
  });
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useWebSocketAdapter(new WsAdapter(app));

  const openApiConfig = new DocumentBuilder()
    .setTitle('Promise API')
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

  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return createServer(expressApp, undefined, binaryMimeTypes);
}

export const handler: Handler = async (event, context, callback) => {
  cachedServer = cachedServer ?? (await bootstrap());
  return proxy(cachedServer, event, context, 'PROMISE', callback).promise;
};
