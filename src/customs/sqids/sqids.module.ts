import { DynamicModule, Module } from '@nestjs/common';

import { SqidsModuleAsyncOptions, SqidsModuleOptions } from './sqids.interface';
import { SqidsService } from './sqids.service';

@Module({
  providers: [SqidsService],
  exports: [SqidsService],
})
export class SqidsModule {
  static register({ global, scope, ...options }: SqidsModuleOptions): DynamicModule {
    return {
      global,
      module: SqidsModule,
      providers: [
        {
          scope,
          provide: SqidsService,
          useValue: new SqidsService(options),
        },
      ],
      exports: [SqidsService],
    };
  }

  static registerAsync({ global, scope, inject, useFactory }: SqidsModuleAsyncOptions): DynamicModule {
    return {
      global,
      module: SqidsModule,
      providers: [
        {
          scope,
          provide: SqidsService,
          inject,
          async useFactory(...args) {
            const opts = await useFactory(...args);
            return new SqidsService(opts);
          },
        },
      ],
      exports: [SqidsService],
    };
  }
}
