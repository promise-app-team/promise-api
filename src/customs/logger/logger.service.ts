import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export abstract class LoggerService implements NestLoggerService {
  protected context?: string;

  setContext(context: string) {
    this.context = context;
  }

  abstract log(message: any, context?: string): any;
  abstract log(message: any, metadata?: Record<string, any>, context?: string): any;

  abstract warn(message: any, context?: string): any;
  abstract warn(message: any, metadata?: Record<string, any>, context?: string): any;

  abstract error(message: any, stack?: string, context?: string): any;
  abstract error(message: any, metadata?: Record<string, any>, stack?: string, context?: string): any;

  abstract debug?(message: any, context?: string): any;
  abstract debug?(message: any, metadata?: Record<string, any>, context?: string): any;

  abstract fatal?(message: any, stack?: string, context?: string): any;
  abstract fatal?(message: any, metadata?: Record<string, any>, stack?: string, context?: string): any;

  abstract verbose?(message: any, context?: string): any;
  abstract verbose?(message: any, metadata?: Record<string, any>, context?: string): any;
}
