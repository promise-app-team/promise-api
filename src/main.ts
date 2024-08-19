import { join } from 'node:path';

import serverlessExpress from '@codegenie/serverless-express';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app';
import { HttpException } from './common/exceptions';
import { AllExceptionsFilter } from './common/filters';
import { MutationLogInterceptor, StringifyDateInterceptor, TimeoutInterceptor } from './common/interceptors';
import { TypedConfigService } from './config/env';
import { LoggerService } from './customs/logger';
import { JwtAuthTokenService } from './modules/auth';
import { configureWebSocketEvent } from './modules/event';
import { PrismaService } from './prisma';

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Handler } from 'aws-lambda';

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

async function initializeApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  }).then(configure);

  const config = app.get(TypedConfigService);

  app
    .useStaticAssets(join(__dirname, 'public'), { prefix: '/' })
    .useStaticAssets(join(__dirname, 'assets'), { prefix: '/assets' })
    .setBaseViewsDir(join(__dirname, 'views'))
    .setViewEngine('hbs');

  const openApiConfig = new DocumentBuilder()
    .setTitle('Promise API')
    .setVersion(`${config.get('version')}`)
    .addSecurity('bearer', { type: 'http', scheme: 'bearer' })
    .setDescription(
      [
        '<div><b>Promise API Documentation for Developers</b></div>',
        '<hr/>',
        '<span>OpenAPI Specification [<a href="/api-json">JSON</a>|<a href="/api-yaml">YAML</a>]</span>',
        '| <a href="/dev">For Developers</a>',
      ].join('\n')
    )
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Promise API',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/assets/swagger/custom.css',
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true,
    },
  });

  process.on('unhandledRejection', (reason) => {
    Logger.fatal(undefined, reason as string, 'UnhandledRejection');
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

export const handler: Handler = async (event, context, callback) => {
  configureWebSocketEvent(event);
  return (await bootstrap)(event, context, callback);
};
