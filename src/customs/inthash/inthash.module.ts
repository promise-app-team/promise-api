import { DynamicModule, Module } from '@nestjs/common';

import { IntHashModuleAsyncOptions, IntHashModuleOptions } from './inthash.interface';
import { InthashService } from './inthash.service';

@Module({})
export class IntHashModule {
  static register(options: IntHashModuleOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: IntHashModule,
      providers: [
        {
          scope: options.scope,
          provide: InthashService,
          useValue: new InthashService(options),
        },
      ],
      exports: [InthashService],
    };
  }

  static registerAsync(options: IntHashModuleAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: IntHashModule,
      providers: [
        {
          scope: options.scope,
          provide: InthashService,
          inject: options.inject,
          async useFactory(...args) {
            const opts = await options.useFactory(...args);
            return new InthashService(opts);
          },
        },
      ],
      exports: [InthashService],
    };
  }
}
