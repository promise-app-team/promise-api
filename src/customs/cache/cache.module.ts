import { DynamicModule, Module } from '@nestjs/common';

import { CacheModuleAsyncOptions, CacheModuleOptions } from './cache.interface';
import { CacheService } from './services';

@Module({})
export class CacheModule {
  static register(options: CacheModuleOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: CacheModule,
      providers: [
        {
          scope: options.scope,
          provide: CacheService,
          useValue: options.service,
        },
      ],
      exports: [CacheService],
    };
  }

  static registerAsync(options: CacheModuleAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: CacheModule,
      providers: [
        {
          scope: options.scope,
          provide: CacheService,
          inject: options.inject,
          async useFactory(...args) {
            const opts = await options.useFactory(...args);
            return opts.service;
          },
        },
      ],
      exports: [CacheService],
    };
  }
}
