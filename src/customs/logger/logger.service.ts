import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

import { logger } from './logger';
import { LoggerModuleOptions, LoggingContext } from './logger.interface';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger = logger;

  constructor(private readonly options?: LoggerModuleOptions) {}

  // for custom logger

  info(message: string, context?: LoggingContext) {
    this.logger.info(message, context);
  }

  // for nestjs logger

  log(message: any, ...optionalParams: any[]) {
    const [param] = optionalParams;
    const metadata = typeof param === 'string' ? { label: param } : { ...param };
    if (this.options?.filter?.({ level: 'log', message, metadata }) === false) return;
    this.logger.info(message, metadata);
  }

  warn(message: any, ...optionalParams: any[]) {
    const [param] = optionalParams;
    const metadata = typeof param === 'string' ? { label: param } : { ...param };
    if (this.options?.filter?.({ level: 'warn', message, metadata }) === false) return;
    this.logger.warn(message, { label: optionalParams });
  }

  error(message: any, ...optionalParams: any[]) {
    const metadata =
      typeof optionalParams[0] === 'string'
        ? {
            error: optionalParams[0],
            label: optionalParams[1],
          }
        : typeof optionalParams[0] === 'object'
          ? {
              error: optionalParams[0].error,
              label: optionalParams[0].label,
            }
          : {
              ...optionalParams,
            };

    if (this.options?.filter?.({ level: 'error', message, metadata }) === false) return;
    this.logger.error(message, metadata);
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
