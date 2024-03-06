import { Module } from '@nestjs/common';

import { PromiseController } from '@/modules/promise/promise.controller';
import { PromiseService } from '@/modules/promise/promise.service';
import { UserService } from '@/modules/user/user.service';

@Module({
  controllers: [PromiseController],
  providers: [UserService, PromiseService],
})
export class PromiseModule {}
