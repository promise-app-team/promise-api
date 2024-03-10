import { DynamicModule, Module } from '@nestjs/common';

import { LoggerOptions } from '@/customs/logger/logger.interface';
import { LoggerService } from '@/customs/logger/logger.service';

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
