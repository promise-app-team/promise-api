import { DynamicModule, Module } from '@nestjs/common';

import { LoggerOptions } from './logger.interface';
import { LoggerService } from './logger.service';

@Module({})
export class LoggerModule {
  static forRoot(options?: LoggerOptions): DynamicModule {
    return {
      module: LoggerModule,
      global: options?.global,
      providers: [
        {
          provide: LoggerService,
          useFactory: () => new LoggerService(options),
        },
      ],
      exports: [LoggerService],
    };
  }
}
