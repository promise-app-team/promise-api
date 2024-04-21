import { Module, Scope } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

import { AppController } from '@/app/app.controller';
import { CommonModule } from '@/common/modules';
import { TypedConfigService, extraEnv } from '@/config/env';
import { schema } from '@/config/validation';
import { CacheModule, InMemoryCacheService, RedisCacheService } from '@/customs/cache';
import { LoggerModule, LoggerService } from '@/customs/logger';
import { TypedConfigModule } from '@/customs/typed-config';
import { WinstonLoggerService, createWinstonLogger } from '@/customs/winston-logger';
import { AuthModule } from '@/modules/auth';
import { EventModule } from '@/modules/event';
import { PromiseModule } from '@/modules/promise';
import { FileUploadModule } from '@/modules/upload';
import { UserModule } from '@/modules/user';
import { PrismaModule } from '@/prisma';

@Module({
  imports: [
    TypedConfigModule.register({
      isGlobal: true,
      load: [extraEnv],
      envFilePath: ['.env.local'],
      validationSchema: schema,
      expandVariables: true,
      config: TypedConfigService,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          secret: config.get('jwt.secret'),
        };
      },
    }),
    LoggerModule.registerAsync({
      isGlobal: true,
      scope: Scope.TRANSIENT,
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          logger: new WinstonLoggerService({
            winston: createWinstonLogger({
              colorize: config.get('colorize'),
            }),
            filter(args) {
              const context = args.metadata.context ?? '';

              switch (config.get('stage')) {
                case 'test':
                  return false;
                case 'local':
                // return true;
                case 'dev':
                case 'prod':
                  if (
                    [
                      'NestApplication',
                      'NestFactory',
                      'InstanceLoader',
                      'RoutesResolver',
                      'RouterExplorer',
                      'WebSocketsController',
                    ].includes(context)
                  ) {
                    return false;
                  }
              }

              return true;
            },
          }),
        };
      },
    }),
    PrismaModule.registerAsync({
      isGlobal: true,
      inject: [LoggerService, TypedConfigService],
      useFactory(logger: LoggerService, config: TypedConfigService) {
        const prisma = new PrismaClient({
          errorFormat: config.get('colorize') ? 'pretty' : 'colorless',
          log: config.get('debug.prisma')
            ? [
                { level: 'info', emit: 'event' },
                { level: 'query', emit: 'event' },
                { level: 'warn', emit: 'event' },
                { level: 'error', emit: 'event' },
              ]
            : [
                { level: 'warn', emit: 'event' },
                { level: 'error', emit: 'event' },
              ],
        });

        const tableName = config.get('db.name');
        prisma.$on('query', ({ query, params, duration }) => {
          const sanitizedQuery = query
            .replace(/^SELECT\s+(.*?)\s+FROM/, 'SELECT * FROM')
            .replace(new RegExp(`\`${tableName}[._a-z]+?\`\.`, 'g'), '')
            .replace(/\((?<table>`.+?`).(?<field>`.+?`)\)/g, '$<table>.$<field>');
          const param = JSON.parse(params);
          const injectedQuery = sanitizedQuery.replace(/\?/g, () => {
            const value = param.shift();
            return typeof value === 'string' ? `'${value}'` : value;
          });
          logger.log(undefined, { query: injectedQuery, ms: duration }, 'QUERY');
        });

        return { prisma };
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          service: config.get('is.test')
            ? new InMemoryCacheService()
            : new RedisCacheService({
                host: config.get('redis.host'),
                port: config.get('redis.port'),
                password: config.get('redis.password'),
              }),
        };
      },
    }),
    AuthModule,
    UserModule,
    EventModule,
    PromiseModule,
    FileUploadModule,
    CommonModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
