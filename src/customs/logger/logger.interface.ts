import type { LoggerService } from './logger.service';
import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';
import type { Simplify } from 'type-fest';

interface InternalLoggerModuleOptions {
  logger?: LoggerService;
}

interface InternalLoggerModuleAsyncOptions extends BaseFactoryProvider<InternalLoggerModuleOptions> {}

export type LoggerModuleOptions = Simplify<InternalLoggerModuleOptions & BaseModuleOptions>;
export type LoggerModuleAsyncOptions = Simplify<InternalLoggerModuleAsyncOptions & BaseModuleOptions>;
