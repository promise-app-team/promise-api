import { Module } from '@nestjs/common';

import { TypedConfigService } from '@/config/env';
import { IntHashModule } from '@/customs/inthash/inthash.module';
import { PromiseController } from '@/modules/promise/promise.controller';
import { PromiseService } from '@/modules/promise/promise.service';
import { UserService } from '@/modules/user/user.service';

@Module({
  imports: [
    IntHashModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory(config: TypedConfigService) {
        return {
          bits: config.get('inthash.bits'),
          prime: config.get('inthash.prime'),
          inverse: config.get('inthash.inverse'),
          xor: config.get('inthash.xor'),
        };
      },
    }),
  ],
  controllers: [PromiseController],
  providers: [UserService, PromiseService],
})
export class PromiseModule {}
