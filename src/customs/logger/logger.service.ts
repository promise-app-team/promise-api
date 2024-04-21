import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export abstract class LoggerService<Options extends Record<string, any> = Record<string, any>>
  implements NestLoggerService
{
  protected context?: string;
  protected options?: Options;

  constructor();
  constructor(options: Options);
  constructor(context: string, options: Options);
  constructor(...args: any[]) {
    const [context, options] = typeof args[0] === 'object' ? [undefined, args[0]] : args;
    this.context = context;
    this.options = options;
  }

  setContext(context: string) {
    this.context = context;
  }

  abstract log(message: any, context?: string): any;
  abstract log(message: any, metadata?: Record<string, any>, context?: string): any;

  abstract warn(message: any, context?: string): any;
  abstract warn(message: any, metadata?: Record<string, any>, context?: string): any;

  abstract error(message: any, stack?: string, context?: string): any;
  abstract error(message: any, metadata?: Record<string, any>, stack?: string, context?: string): any;

  abstract debug(message: any, context?: string): any;
  abstract debug(message: any, metadata?: Record<string, any>, context?: string): any;

  abstract fatal(message: any, stack?: string, context?: string): any;
  abstract fatal(message: any, metadata?: Record<string, any>, stack?: string, context?: string): any;

  abstract verbose(message: any, context?: string): any;
  abstract verbose(message: any, metadata?: Record<string, any>, context?: string): any;
}
