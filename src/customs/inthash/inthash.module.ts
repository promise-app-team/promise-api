import { DynamicModule, Module } from '@nestjs/common';

import { IntHashModuleAsyncOptions, IntHashModuleOptions } from './inthash.interface';
import { InthashService } from './inthash.service';

@Module({})
export class IntHashModule {
  static register({ global, scope, ...options }: IntHashModuleOptions): DynamicModule {
    return {
      global,
      module: IntHashModule,
      providers: [
        {
          scope,
          provide: InthashService,
          useValue: new InthashService(options),
        },
      ],
      exports: [InthashService],
    };
  }

  static registerAsync({ global, scope, inject, useFactory }: IntHashModuleAsyncOptions): DynamicModule {
    return {
      global,
      module: IntHashModule,
      providers: [
        {
          scope,
          inject,
          provide: InthashService,
          async useFactory(...args) {
            const opts = await useFactory(...args);
            return new InthashService(opts);
          },
        },
      ],
      exports: [InthashService],
    };
  }
}
