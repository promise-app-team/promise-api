import { Module } from '@nestjs/common';

import { UserService } from '../user/user.service';

import { PromiseController } from './promise.controller';
import { PromiseService } from './promise.service';

import { TypedConfigService } from '@/config/env';
import { IntHashModule } from '@/customs/inthash/inthash.module';

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
