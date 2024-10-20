import { DynamicModule, Module } from '@nestjs/common'

import { CacheModuleAsyncOptions, CacheModuleOptions } from './cache.interface'
import { CacheService } from './services'

@Module({})
export class CacheModule {
  static register({ global, scope, service }: CacheModuleOptions): DynamicModule {
    return {
      global,
      module: CacheModule,
      providers: [
        {
          scope,
          provide: CacheService,
          useValue: service,
        },
      ],
      exports: [CacheService],
    }
  }

  static registerAsync({ global, scope, inject, useFactory }: CacheModuleAsyncOptions): DynamicModule {
    return {
      global,
      module: CacheModule,
      providers: [
        {
          scope,
          inject,
          provide: CacheService,
          async useFactory(...args) {
            const opts = await useFactory(...args)
            return opts.service
          },
        },
      ],
      exports: [CacheService],
    }
  }
}
