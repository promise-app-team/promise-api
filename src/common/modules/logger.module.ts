import { DynamicModule, Module } from '@nestjs/common';

import { LOGGER_MODULE_OPTIONS } from '@/common/constants/logger.constant';
import { LoggerOptions } from '@/common/interfaces/logger.interface';
import { LoggerService } from '@/common/services/logger.service';

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
