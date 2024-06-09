import type { CacheService } from './services';
import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';

interface _CacheModuleOptions {
  service: CacheService;
}

interface _CacheModuleAsyncOptions extends BaseFactoryProvider<_CacheModuleOptions> {}

export type CacheModuleOptions = _CacheModuleOptions & BaseModuleOptions;
export type CacheModuleAsyncOptions = _CacheModuleAsyncOptions & BaseModuleOptions;
