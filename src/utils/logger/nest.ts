import type { LoggerService } from '@nestjs/common';
import type { Logger } from 'winston';

export default class NestLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: any, ...optionalParams: any[]) {
    if (typeof optionalParams[0] === 'string') {
      return this.logger.info(message, { label: optionalParams[0] });
    }
    this.logger.info(message, { ...optionalParams[0] });
  }

  error(message: any, ...optionalParams: any[]) {
    if (typeof optionalParams[1] === 'string') {
      return this.logger.error('', {
        error: optionalParams[0],
        label: optionalParams[1],
      });
    }

    if (typeof optionalParams[0] === 'object') {
      return this.logger.error('', {
        error: optionalParams[0].error,
        label: optionalParams[0].label,
      });
    }

    this.logger.error(message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, { label: optionalParams[0] });
  }
}
