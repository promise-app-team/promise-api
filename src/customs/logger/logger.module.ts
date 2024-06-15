import { ConsoleLogger, DynamicModule, Module } from '@nestjs/common';

import { LoggerModuleAsyncOptions, LoggerModuleOptions } from './logger.interface';
import { LoggerService } from './logger.service';

@Module({})
export class LoggerModule {
  static register({ global, scope, logger }: LoggerModuleOptions): DynamicModule {
    return {
      global,
      module: LoggerModule,
      providers: [
        {
          scope,
          provide: LoggerService,
          useValue: logger ?? new ConsoleLogger(),
        },
      ],
      exports: [LoggerService],
    };
  }

  static registerAsync({ global, scope, inject, useFactory }: LoggerModuleAsyncOptions): DynamicModule {
    return {
      global,
      module: LoggerModule,
      providers: [
        useFactory
          ? {
              scope,
              inject,
              provide: LoggerService,
              async useFactory(...args) {
                const opts = await useFactory?.(...args);
                return opts?.logger ?? new ConsoleLogger();
              },
            }
          : {
              scope,
              provide: LoggerService,
              useClass: ConsoleLogger,
            },
      ],
      exports: [LoggerService],
    };
  }
}
