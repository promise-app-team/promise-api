import { DynamicModule, Module } from '@nestjs/common';
import { Hasher } from 'inthash';

import { IntHashModuleAsyncOptions, IntHashModuleOptions } from './inthash.interface';
import { InthashService } from './inthash.service';

@Module({})
export class IntHashModule {
  static forRoot(options: IntHashModuleOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: IntHashModule,
      providers: [
        {
          scope: options.scope,
          provide: InthashService,
          useFactory: () => new InthashService(new Hasher(options)),
        },
      ],
      exports: [InthashService],
    };
  }

  static forRootAsync(options: IntHashModuleAsyncOptions): DynamicModule {
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
            return new InthashService(new Hasher(opts));
          },
        },
      ],
      exports: [InthashService],
    };
  }
}
