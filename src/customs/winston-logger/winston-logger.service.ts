import { Injectable, LogLevel } from '@nestjs/common';
import { Logger } from 'winston';

import { LoggerService } from '../logger';

import { FilterArgs, LoggerOptions } from './winston-logger.interface';

@Injectable()
export class WinstonLoggerService extends LoggerService<LoggerOptions> {
  private readonly logger: Logger;

  constructor(options: LoggerOptions);
  constructor(context: string, options: LoggerOptions);
  constructor(...args: any[]) {
    const [context, options] = args.length === 1 ? [undefined, args[0]] : args;
    super(context, options);
    this.logger = options.winston;
  }

  log(message: any, ...optionalParams: any[]) {
    const metadata = this.metadata('log', optionalParams);
    if (this.isFiltered({ level: 'log', message, metadata })) return;
    this.logger.info(message, metadata);
  }

  warn(message: any, ...optionalParams: any[]) {
    const metadata = this.metadata('warn', optionalParams);
    if (this.isFiltered({ level: 'warn', message, metadata })) return;
    this.logger.warn(message, metadata);
  }

  error(message: any, ...optionalParams: any[]) {
    const metadata = this.metadata('error', optionalParams);
    if (this.isFiltered({ level: 'error', message, metadata })) return;
    this.logger.error(message, metadata);
  }

  debug(message: any, ...optionalParams: any[]) {
    const metadata = this.metadata('debug', optionalParams);
    if (this.isFiltered({ level: 'debug', message, metadata })) return;
    this.logger.debug(message, metadata);
  }

  fatal(message: any, ...optionalParams: any[]) {
    const metadata = this.metadata('fatal', optionalParams);
    if (this.isFiltered({ level: 'fatal', message, metadata })) return;
    this.logger.error(message, metadata);
  }

  verbose(message: any, ...optionalParams: any[]) {
    const metadata = this.metadata('verbose', optionalParams);
    if (this.isFiltered({ level: 'verbose', message, metadata })) return;
    this.logger.verbose(message, metadata);
  }

  private isFiltered(args: FilterArgs): boolean {
    return this.options?.filter?.(args) === false;
  }

  private metadata(level: LogLevel, params: any[]): Record<string, any> {
    const base = { level, context: this.context };
    if (!params.length) return base;

    if (['error', 'fatal'].includes(level)) {
      const [meta, error, context] = typeof params[0] === 'object' ? params : [undefined, params[0], params[1]];
      return { ...base, error, context: context || this.context, ...meta };
    } else {
      const [meta, context] = typeof params[0] === 'object' ? params : [undefined, params[0]];
      return { ...base, context: context || this.context, ...meta };
    }
  }
}
