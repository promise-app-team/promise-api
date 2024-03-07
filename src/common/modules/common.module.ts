import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { extraEnv } from '@/common/config/env';
import { schema } from '@/common/config/validation';
import { HasherService } from '@/common/services/hasher.service';
import { TypedConfigService } from '@/common/services/typed-config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [extraEnv],
      envFilePath: ['.env'],
      validationSchema: schema,
      expandVariables: true,
    }),
  ],
  providers: [Logger, HasherService, TypedConfigService],
  exports: [HasherService, TypedConfigService, Logger],
})
export class CommonModule {}
