import type { Handler } from 'aws-lambda';

import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  Logger,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { StringifyDateInterceptor } from '@/modules/common/interceptors/stringify-date.interceptor';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from '@/app/app.module';
import { join } from 'path';

const API_VERSION = process.env.npm_package_version || '0.0.0';

async function initializeApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, 'assets'), { prefix: '/assets' });
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalInterceptors(new StringifyDateInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableCors();

  const openApiConfig = new DocumentBuilder()
    .setTitle('Promise API')
    .setVersion(API_VERSION)
    .addTag('App', 'Entry point of API')
    .addSecurity('bearer', { type: 'http', scheme: 'bearer' })
    .setExternalDoc('OpenAPI Specification (JSON)', `/api-json`)
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Promise API',
    customfavIcon: '/assets/favicon.ico',
    customCssUrl: '/assets/css/swagger.css',
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true,
    },
  });

  return app;
}

let bootstrap: Promise<Handler>;
if (process.env.NODE_ENV === 'local') {
  const HOST = process.env.HOST || '127.0.0.1';
  const PORT = +(process.env.PORT || 3000);
  const URL = `http://${HOST}:${PORT}`;
  initializeApp()
    .then((app) => app.listen(PORT, HOST))
    .then(() => Logger.log(`🌈 Server running on ${URL}`, 'Bootstrap'));
} else {
  bootstrap = new Promise<Handler>(async (resolve) => {
    const app = await initializeApp().then((app) => app.init());
    const expressApp = app.getHttpAdapter().getInstance();
    resolve(serverlessExpress({ app: expressApp }));
    Logger.log('🚀 Server initialized', 'Bootstrap');
  });
}

export const handler: Handler = async (...args) => (await bootstrap)(...args);
