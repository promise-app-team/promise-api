import type { LoggerService } from '@nestjs/common';
import winston from 'winston';

export default class NestLogger implements LoggerService {
  constructor(private readonly logger: winston.Logger) {}

  log(message: any, ...optionalParams: any[]) {
    if (typeof optionalParams[0] === 'string') {
      return this.logger.info(message, { label: optionalParams[0] });
    }
    this.logger.info(message, { ...optionalParams[0] });
  }

  error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, {
      error: optionalParams[0],
      label: optionalParams[1],
    });
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, { label: optionalParams[0] });
  }
}
