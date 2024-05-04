import { DynamicModule, Module } from '@nestjs/common';

import { SqidsModuleAsyncOptions, SqidsModuleOptions } from './sqids.interface';
import { SqidsService } from './sqids.service';

@Module({
  providers: [SqidsService],
  exports: [SqidsService],
})
export class SqidsModule {
  static register(options?: SqidsModuleOptions): DynamicModule {
    return {
      global: options?.isGlobal,
      module: SqidsModule,
      providers: [
        {
          scope: options?.scope,
          provide: SqidsService,
          useValue: new SqidsService(options),
        },
      ],
      exports: [SqidsService],
    };
  }

  static registerAsync(options: SqidsModuleAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: SqidsModule,
      providers: [
        {
          scope: options.scope,
          provide: SqidsService,
          inject: options.inject,
          async useFactory(...args) {
            const opts = await options.useFactory(...args);
            return new SqidsService(opts);
          },
        },
      ],
      exports: [SqidsService],
    };
  }
}
