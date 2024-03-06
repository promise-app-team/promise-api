import type { Handler } from 'aws-lambda';

import serverlessExpress from '@codegenie/serverless-express';
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { Logger, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from '@/app/app.module';
import { join } from 'path';
import logger from '@/utils/logger';
import { ConfigService } from '@nestjs/config';
import { StringifyDateInterceptor } from './common/interceptors/stringify-date.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function initializeApp<App extends NestExpressApplication>() {
  const app = await NestFactory.create<App>(AppModule, {
    logger: logger.nest(),
  });

  const config = app.get(ConfigService);
  const { httpAdapter } = app.get(HttpAdapterHost);

  app
    .useStaticAssets(join(__dirname, 'assets'), { prefix: '/assets' })
    .useGlobalPipes(new ValidationPipe({ transform: true }))
    .useGlobalFilters(new PrismaExceptionFilter(httpAdapter))
    .useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new StringifyDateInterceptor(),
      new TimeoutInterceptor()
    )
    .useWebSocketAdapter(new WsAdapter(app))
    .useBodyParser('urlencoded', { limit: '5mb', extended: true })
    .useBodyParser('json', { limit: '5mb' })
    .enableCors();

  const openApiConfig = new DocumentBuilder()
    .setTitle('Promise API')
    .setVersion(`${config.get('API_VERSION')}`)
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

async function startLocalServer() {
  const app = await initializeApp();
  const config = app.get(ConfigService);
  await app.listen(`${config.get('PORT')}`, '0.0.0.0');
  Logger.log(`🌈 Server running on ${await app.getUrl()}`, 'Bootstrap');
}

async function startServerless() {
  const app = await initializeApp().then((app) => app.init());
  Logger.log(`🚀 Serverless app initialized`, 'Bootstrap');
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

let bootstrap: Promise<Handler>;

if (process.env.NODE_ENV === 'local') {
  startLocalServer();
} else {
  bootstrap = startServerless();
}

export const handler: Handler = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return (await bootstrap)(event, context, callback);
};
