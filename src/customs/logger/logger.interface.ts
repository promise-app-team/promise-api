export interface LoggerModuleOptions {
  isGlobal?: boolean;
  blacklist?: string[];
  disable?: boolean;
}

type MaybePromise<T> = T | Promise<T>;

export interface LoggerModuleAsyncOptions {
  isGlobal?: boolean;
  useFactory: (...args: any[]) => MaybePromise<LoggerModuleOptions>;
  inject?: any[];
}

export interface LoggingContext {
  label?: string;
  ms?: number;
}
