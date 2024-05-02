import { Module, Scope } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppController } from '@/app/app.controller';
import { CommonModule } from '@/common/modules';
import { TypedConfigService, env } from '@/config/env';
import { schema } from '@/config/validation';
import { CacheModule, InMemoryCacheService, RedisCacheService } from '@/customs/cache';
import { IntHashModule } from '@/customs/inthash';
import { LoggerModule, LoggerService } from '@/customs/logger';
import { TypedConfigModule } from '@/customs/typed-config';
import { WinstonLoggerService, createWinstonLogger } from '@/customs/winston-logger';
import { AuthModule } from '@/modules/auth';
import { EventModule } from '@/modules/event';
import { PromiseModule } from '@/modules/promise';
import { ThemeModule } from '@/modules/themes';
import { FileUploadModule } from '@/modules/upload';
import { UserModule } from '@/modules/user';
import { PrismaModule } from '@/prisma';

@Module({
  imports: [
    TypedConfigModule.register({
      isGlobal: true,
      load: [env],
      envFilePath: ['.env.local'],
      validationSchema: schema,
      expandVariables: true,
      config: TypedConfigService,
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

        const tableName = `${config.get('db.name')}_${config.get('stage')}`;
        prisma.$on('query', ({ query, params, duration }) => {
          const sanitizedQuery = query
            .replace(/^SELECT\s+(.*?)\s+FROM/, 'SELECT * FROM')
            .replace(new RegExp(`\`${tableName}\`\.`, 'g'), '')
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
    IntHashModule.forRootAsync({
      isGlobal: true,
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          bits: config.get('inthash.bits'),
          prime: config.get('inthash.prime'),
          inverse: config.get('inthash.inverse'),
          xor: config.get('inthash.xor'),
        };
      },
    }),
    AuthModule,
    UserModule,
    ThemeModule,
    PromiseModule,
    FileUploadModule,
    EventModule,
    CommonModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
