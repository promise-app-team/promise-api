import { ConsoleLogger, DynamicModule, Module } from '@nestjs/common';

import { LoggerModuleAsyncOptions, LoggerModuleOptions } from './logger.interface';
import { LoggerService } from './logger.service';

@Module({})
export class LoggerModule {
  static register(options?: LoggerModuleOptions): DynamicModule {
    return {
      global: options?.isGlobal,
      module: LoggerModule,
      providers: [
        {
          scope: options?.scope,
          provide: LoggerService,
          useValue: options?.logger ?? new ConsoleLogger(),
        },
      ],
      exports: [LoggerService],
    };
  }

  static registerAsync(options: LoggerModuleAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: LoggerModule,
      providers: [
        options.useFactory
          ? {
              scope: options.scope,
              provide: LoggerService,
              inject: options.inject ?? [],
              async useFactory(...args) {
                const opts = await options.useFactory?.(...args);
                return opts?.logger ?? new ConsoleLogger();
              },
            }
          : {
              scope: options.scope,
              provide: LoggerService,
              useClass: ConsoleLogger,
            },
      ],
      exports: [LoggerService],
    };
  }
}
