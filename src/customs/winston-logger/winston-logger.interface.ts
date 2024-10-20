import type { Logger } from 'winston'

export interface FilterArgs {
  level: string
  message: string
  metadata: Record<string, any> & {
    context?: string
  }
}

export interface LoggerOptions {
  winston: Logger
  filter?(args: FilterArgs): boolean
}

export interface LoggingContext {
  label?: string
  ms?: number
}
