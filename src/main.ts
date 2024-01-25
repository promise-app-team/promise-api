import type { Server } from 'http';
import type { Handler } from 'aws-lambda';

// @ts-expect-error - no types
import { createServer, proxy } from '@vendia/serverless-express';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from '@/app/app.module';
import { ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
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

let cachedServer: Server;
const binaryMimeTypes: string[] = [];

async function initialize(app: NestExpressApplication): Promise<Server> {
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return createServer(expressApp, undefined, binaryMimeTypes);
}

export const handler: Handler = async (event, context, callback) => {
  const app = await bootstrap();
  cachedServer ??= await initialize(app);
  return proxy(cachedServer, event, context, 'PROMISE', callback).promise;
};

if (process.env.NODE_ENV === 'local') {
  (async () => {
    const app = await bootstrap();
    await app.listen(PORT, '0.0.0.0');
    Logger.log(`Server running on ${await app.getUrl()}`, 'Bootstrap');
  })();
}
