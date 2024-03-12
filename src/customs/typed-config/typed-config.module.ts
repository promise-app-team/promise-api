import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TypedConfigModuleOptions } from './typed-config.interface';

@Module({})
export class TypedConfigModule {
  static forRoot(options: TypedConfigModuleOptions): DynamicModule {
    return {
      module: TypedConfigModule,
      global: options?.isGlobal,
      imports: [ConfigModule.forRoot(options)],
      providers: [options.config],
      exports: [options.config],
    };
  }
}
