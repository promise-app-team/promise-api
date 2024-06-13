import { Module, Scope } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { mapValues } from 'remeda';

import { AppController } from '@/app/app.controller';
import { CommonModule } from '@/common/modules';
import { TypedConfigService } from '@/config/env';
import { schema } from '@/config/validation';
import { CacheModule, InMemoryCacheService, RedisCacheService } from '@/customs/cache';
import { IntHashModule } from '@/customs/inthash';
import { LoggerModule, LoggerService } from '@/customs/logger';
import { SqidsModule } from '@/customs/sqids/sqids.module';
import { TypedConfigModule } from '@/customs/typed-config';
import { WinstonLoggerService, createWinstonLogger } from '@/customs/winston-logger';
import { AuthModule } from '@/modules/auth';
import { DevModule } from '@/modules/dev';
import { EventModule } from '@/modules/event';
import { PromiseModule } from '@/modules/promise';
import { ThemeModule } from '@/modules/themes';
import { FileUploadModule } from '@/modules/upload';
import { UserModule } from '@/modules/user';
import { PrismaModule } from '@/prisma';

@Module({
  imports: [
    TypedConfigModule.register({
      global: true,
      provider: TypedConfigService,
      options: {
        envFilePath: ['.env.local'],
        validationSchema: schema,
        expandVariables: true,
      },
    }),
    LoggerModule.registerAsync({
      global: true,
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
                      'ConditionalModule',
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
      global: true,
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

        const tableName = config.get('db.url').split('/').pop() ?? '';
        prisma.$on('query', ({ query, params, duration }) => {
          if (query.includes('pm_mutation_log')) return;
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
      global: true,
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
    IntHashModule.registerAsync({
      global: true,
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return config.get('inthash');
      },
    }),
    SqidsModule.registerAsync({
      global: true,
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          alphabet: config.get('sqids.key'),
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

    ConditionalModule.registerWhen(DevModule, ({ STAGE }) => !['prod'].includes(STAGE || '')),
  ],
  controllers: [AppController],
})
export class AppModule {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: TypedConfigService
  ) {
    if (this.config.get('debug.memory')) {
      setInterval(() => {
        const memoryUsage = mapValues(process.memoryUsage(), (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`);
        this.logger.debug(JSON.stringify(memoryUsage), 'MemoryUsage');
      }, 60_000);
    }
  }
}
