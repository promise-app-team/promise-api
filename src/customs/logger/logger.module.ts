import { DynamicModule, Module } from '@nestjs/common';

import { LOGGER_MODULE_OPTIONS } from '@/customs/logger/logger.constant';
import { LoggerOptions } from '@/customs/logger/logger.interface';
import { LoggerService } from '@/customs/logger/logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {
  static forRoot(options?: LoggerOptions): DynamicModule {
    return {
      module: LoggerModule,
      global: options?.global,
      providers: [{ provide: LOGGER_MODULE_OPTIONS, useValue: options }],
    };
  }
}
