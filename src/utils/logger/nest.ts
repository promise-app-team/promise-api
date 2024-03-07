import type { LoggerService } from '@nestjs/common';
import type { Logger } from 'winston';

const blacklist = new Set([
  'NestFactory',
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'WebSocketEventGateway',
  'WebSocketsController',
]);

export default class NestLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: any, ...optionalParams: any[]) {
    const param = optionalParams[0];
    if (typeof param === 'string') {
      if (blacklist.has(param)) return;
      this.logger.info(message, { label: param });
    } else {
      this.logger.info(message, { ...param });
    }
  }

  error(message: any, ...optionalParams: any[]) {
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

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, { label: optionalParams[0] });
  }
}
