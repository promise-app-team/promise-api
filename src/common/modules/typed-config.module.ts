import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { extraEnv } from '@/common/config/env';
import { schema } from '@/common/config/validation';
import { TypedConfigService } from '@/common/services/typed-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [extraEnv],
      envFilePath: ['.env.local'],
      validationSchema: schema,
      expandVariables: true,
    }),
  ],
  providers: [TypedConfigService],
  exports: [TypedConfigService],
})
export class TypedConfigModule {
  static forRoot(options?: { global: boolean }): DynamicModule {
    return {
      module: TypedConfigModule,
      global: options?.global,
    };
  }
}
