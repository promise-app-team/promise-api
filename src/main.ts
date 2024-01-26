import type { Handler } from 'aws-lambda';

import createServer from '@codegenie/serverless-express';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from '@/app/app.module';
import { join } from 'path';

const PORT = +(process.env.PORT || 3000);
const API_VERSION = process.env.npm_package_version || '0.0.0';

async function bootstrap<App extends NestExpressApplication>(): Promise<App> {
  const app = await NestFactory.create<App>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'assets'), { prefix: '/assets' });
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

async function initialize(app: NestExpressApplication) {
  await app.init();
  return createServer({ app: app.getHttpAdapter().getInstance() });
}

let cached: Handler;
export const handler: Handler = async (...args) => {
  const app = await bootstrap();
  cached ??= await initialize(app);
  return cached(...args);
};

if (process.env.NODE_ENV === 'local') {
  (async () => {
    const app = await bootstrap();
    await app.listen(PORT, '0.0.0.0');
    Logger.log(`Server running on ${await app.getUrl()}`, 'Bootstrap');
  })();
}
