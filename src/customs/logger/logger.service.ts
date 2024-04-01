import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

import { logger } from './logger';
import { LoggerModuleOptions, LoggingContext } from './logger.interface';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger = logger;

  constructor(private readonly options?: LoggerModuleOptions) {}

  // for custom logger

  info(message: string, context?: LoggingContext) {
    if (this.options?.disable) return;
    this.logger.info(message, context);
  }

  // for nestjs logger

  log(message: any, ...optionalParams: any[]) {
    if (this.options?.disable) return;
    const param = optionalParams[0];
    if (typeof param === 'string') {
      if (this.options?.blacklist?.includes(param)) return;
      this.logger.info(message, { label: param });
    } else {
      this.logger.info(message, { ...param });
    }
  }

  warn(message: any, ...optionalParams: any[]) {
    if (this.options?.disable) return;
    this.logger.warn(message, { label: optionalParams[0] });
  }

  error(message: any, ...optionalParams: any[]) {
    if (this.options?.disable) return;
    if (typeof optionalParams[1] === 'string') {
      this.logger.error('', {
        error: optionalParams[0],
        label: optionalParams[1],
      });
    } else if (typeof optionalParams[0] === 'object') {
      this.logger.error('', {
        error: optionalParams[0].error,
        label: optionalParams[0].label,
      });
    } else {
      this.logger.error(message, ...optionalParams);
    }
  }

  /**
   * @deprecated Method not implemented.
   */
  fatal(_message: any, ..._optionalParams: any[]) {
    throw new Error('Method not implemented.');
  }

  /**
   * @deprecated Method not implemented.
   */
  debug?(_message: any, ..._optionalParams: any[]) {
    throw new Error('Method not implemented.');
  }

  /**
   * @deprecated Method not implemented.
   */
  verbose?(_message: any, ..._optionalParams: any[]) {
    throw new Error('Method not implemented.');
  }
}
