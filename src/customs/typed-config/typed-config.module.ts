import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import type { TypedConfigModuleOptions } from './typed-config.interface'
import type { DynamicModule } from '@nestjs/common'

@Module({})
export class TypedConfigModule {
  static register({ provider, options, global, scope }: TypedConfigModuleOptions): DynamicModule {
    return {
      module: TypedConfigModule,
      global,
      imports: [
        ConfigModule.forRoot({
          ...options,
          load: [Reflect.getMetadata(`${provider.name}:factory`, provider)],
        }),
      ],
      providers: [
        {
          scope,
          provide: provider,
          inject: [ConfigService],
          useFactory(config: ConfigService) {
            return new provider(config)
          },
        },
      ],
      exports: [provider],
    }
  }
}
