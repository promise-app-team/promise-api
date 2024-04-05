import { DynamicModule, Module } from '@nestjs/common';

import { LoggerModuleAsyncOptions, LoggerModuleOptions } from './logger.interface';
import { LoggerService } from './logger.service';

@Module({})
export class LoggerModule {
  static register(options?: LoggerModuleOptions): DynamicModule {
    return {
      module: LoggerModule,
      global: options?.isGlobal,
      providers: [
        {
          provide: LoggerService,
          useFactory: () => new LoggerService(options),
        },
      ],
      exports: [LoggerService],
    };
  }

  static registerAsync(options: LoggerModuleAsyncOptions): DynamicModule {
    return {
      module: LoggerModule,
      global: options.isGlobal,
      providers: [
        {
          provide: LoggerService,
          async useFactory(...args) {
            const opts = await options.useFactory(...args);
            return new LoggerService(opts);
          },
          inject: options.inject,
        },
      ],
      exports: [LoggerService],
    };
  }
}
