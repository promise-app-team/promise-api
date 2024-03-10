import { join } from 'node:path';

import serverlessExpress from '@codegenie/serverless-express';
import { Logger, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Handler } from 'aws-lambda';

import { AppModule } from '@/app/app.module';
import { AllExceptionsFilter, HttpException, StringifyDateInterceptor, TimeoutInterceptor } from '@/common';
import { TypedConfigService } from '@/config/env';
import { LoggerService } from '@/customs/logger';

async function initializeApp<App extends NestExpressApplication>() {
  const app = await NestFactory.create<App>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(LoggerService));
  const config = app.get(TypedConfigService);
  const { httpAdapter } = app.get(HttpAdapterHost);

  app
    .useStaticAssets(join(__dirname, 'assets'), { prefix: '/' })
    .useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        stopAtFirstError: false,
        exceptionFactory(errors) {
          const error = Object.values(errors[0].constraints ?? {}).pop();
          return HttpException.new(error ?? 'Unexpected Error', 'BAD_REQUEST');
        },
      })
    )
    .useGlobalFilters(new AllExceptionsFilter(httpAdapter))
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
    .setVersion(`${config.get('version')}`)
    .addSecurity('bearer', { type: 'http', scheme: 'bearer' })
    .setExternalDoc('OpenAPI Specification (JSON)', `/api-json`)
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Promise API',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/css/swagger.css',
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true,
    },
  });

  return app;
}

async function startLocalServer() {
  const app = await initializeApp();
  const config = app.get(TypedConfigService);
  await app.listen(`${config.get('port')}`, '0.0.0.0');
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
