import { CacheService } from './services';

export interface CacheModuleOptions {
  service: CacheService;
}

export interface CacheModuleAsyncOptions {
  isGlobal?: boolean;
  inject?: any[];
  useFactory: (...args: any[]) => CacheModuleOptions | Promise<CacheModuleOptions>;
}
