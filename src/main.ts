import { join } from 'node:path';

import serverlessExpress from '@codegenie/serverless-express';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APIGatewayEvent, Handler } from 'aws-lambda';

import { AppModule } from './app';
import { HttpException } from './common/exceptions';
import { AllExceptionsFilter } from './common/filters';
import { MutationLogInterceptor, StringifyDateInterceptor, TimeoutInterceptor } from './common/interceptors';
import { TypedConfigService } from './config/env';
import { LoggerService } from './customs/logger';
import { JwtAuthTokenService } from './modules/auth';
import { PrismaService } from './prisma';

export async function configure(app: NestExpressApplication) {
  const logger = await app.resolve(LoggerService);
  const { httpAdapter } = app.get(HttpAdapterHost);
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtAuthTokenService);

  app.useLogger(logger);

  app
    .useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        stopAtFirstError: true,
        validateCustomDecorators: true,
        exceptionFactory(errors) {
          const error = Object.values(errors[0].constraints ?? {}).pop();
          return HttpException.new(error ?? 'Unexpected Error', 'BAD_REQUEST');
        },
      })
    )
    .useGlobalFilters(new AllExceptionsFilter(httpAdapter, logger))
    .useGlobalInterceptors(
      new ClassSerializerInterceptor(reflector),
      new MutationLogInterceptor(prisma, logger, jwt),
      new StringifyDateInterceptor(),
      new TimeoutInterceptor()
    )
    .useWebSocketAdapter(new WsAdapter(app))
    .useBodyParser('urlencoded', { limit: '5mb', extended: true })
    .useBodyParser('json', { limit: '5mb' })
    .enableCors();

  return app;
}

async function initializeApp<App extends NestExpressApplication>() {
  const app = await NestFactory.create<App>(AppModule, {
    bufferLogs: true,
  }).then(configure);

  const config = app.get(TypedConfigService);

  app
    .useStaticAssets(join(__dirname, 'public'), { prefix: '/' })
    .useStaticAssets(join(__dirname, 'assets'), { prefix: '/assets' });

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
  const config = app.get(TypedConfigService);
  await app.listen(`${config.get('port')}`, '0.0.0.0');
  Logger.log(`🌈 Server running on ${await app.getUrl()}`, 'Bootstrap');
}

async function startServerless() {
  const app = await initializeApp().then((app) => app.init());
  const config = app.get(TypedConfigService);
  const handler = serverlessExpress({
    app: app.getHttpAdapter().getInstance(),
    logSettings: config.get('debug.lambda') ? { level: 'debug' } : undefined,
  });
  Logger.log(`🚀 Serverless app initialized`, 'Bootstrap');
  return handler;
}

let bootstrap: Promise<Handler>;

if (process.env.SERVERLESS) {
  bootstrap = startServerless();
} else if (process.env.STAGE === 'local') {
  startLocalServer();
}

function configureWebSocketEvent(event: APIGatewayEvent) {
  const { requestContext } = event;
  const { connectionId, eventType } = requestContext ?? {};
  if (!eventType) return;

  if (eventType === 'MESSAGE') {
    const body = JSON.parse(event.body ?? '{}');
    event.path = `/event/${body.event ?? 'unknown'}`;
    event.httpMethod = 'POST';
  } else {
    event.path = `/event/${eventType.toLowerCase()}`;
    event.httpMethod = 'GET';
  }

  (event.queryStringParameters ??= {})['connectionId'] = connectionId ?? '';
  (event.multiValueQueryStringParameters ??= {})['connectionId'] = [connectionId ?? ''];
}

export const handler: Handler = async (event, context, callback) => {
  configureWebSocketEvent(event);
  return (await bootstrap)(event, context, callback);
};
