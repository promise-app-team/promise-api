import { DynamicModule, Module } from '@nestjs/common';
import { Hasher } from 'inthash';

import { IntHashModuleAsyncOptions, IntHashModuleOptions } from '@/customs/inthash/inthash.interface';
import { InthashService } from '@/customs/inthash/inthash.service';

@Module({})
export class IntHashModule {
  static forRoot(options: IntHashModuleOptions): DynamicModule {
    return {
      module: IntHashModule,
      providers: [
        {
          provide: InthashService,
          useFactory: () => new InthashService(new Hasher(options)),
        },
      ],
      exports: [InthashService],
    };
  }

  static forRootAsync(options: IntHashModuleAsyncOptions): DynamicModule {
    return {
      module: IntHashModule,
      providers: [
        {
          provide: InthashService,
          async useFactory(...args) {
            const opts = await options.useFactory(...args);
            return new InthashService(new Hasher(opts));
          },
          inject: options.inject,
        },
      ],
      exports: [InthashService],
    };
  }
}
