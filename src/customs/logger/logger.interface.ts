export interface LoggerOptions {
  blacklist?: string[];
  global?: boolean;
}

export interface LoggingContext {
  label?: string;
  ms?: number;
}
