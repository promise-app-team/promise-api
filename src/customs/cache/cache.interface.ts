import type { CacheService } from './services';
import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';
import type { Simplify } from 'type-fest';

interface InternalCacheModuleOptions {
  service: CacheService;
}

interface InternalCacheModuleAsyncOptions extends BaseFactoryProvider<InternalCacheModuleOptions> {}

export type CacheModuleOptions = Simplify<InternalCacheModuleOptions & BaseModuleOptions>;
export type CacheModuleAsyncOptions = Simplify<InternalCacheModuleAsyncOptions & BaseModuleOptions>;
