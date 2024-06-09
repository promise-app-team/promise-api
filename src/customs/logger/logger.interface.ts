import type { LoggerService } from './logger.service';
import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';

interface _LoggerModuleOptions {
  logger?: LoggerService;
}

interface _LoggerModuleAsyncOptions extends BaseFactoryProvider<_LoggerModuleOptions> {}

export type LoggerModuleOptions = _LoggerModuleOptions & BaseModuleOptions;
export type LoggerModuleAsyncOptions = _LoggerModuleAsyncOptions & BaseModuleOptions;
