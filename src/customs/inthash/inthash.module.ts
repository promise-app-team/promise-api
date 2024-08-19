import { DynamicModule, Module } from '@nestjs/common';

import { IntHashModuleAsyncOptions, IntHashModuleOptions } from './inthash.interface';
import { IntHashService } from './inthash.service';

@Module({})
export class IntHashModule {
  static register({ global, scope, ...options }: IntHashModuleOptions): DynamicModule {
    return {
      global,
      module: IntHashModule,
      providers: [
        {
          scope,
          provide: IntHashService,
          useValue: new IntHashService(options),
        },
      ],
      exports: [IntHashService],
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
          provide: IntHashService,
          async useFactory(...args) {
            const opts = await useFactory(...args);
            return new IntHashService(opts);
          },
        },
      ],
      exports: [IntHashService],
    };
  }
}
