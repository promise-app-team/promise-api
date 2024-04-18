interface FilterArgs {
  level: string;
  message: string;
  metadata: Record<string, any>;
}

export interface LoggerModuleOptions {
  isGlobal?: boolean;
  filter?: (args: FilterArgs) => boolean;
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
