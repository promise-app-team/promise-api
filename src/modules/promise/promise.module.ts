import { Module } from '@nestjs/common'

import { UserService } from '../user'

import { PromiseController } from './promise.controller'
import { PromiseService } from './promise.service'

@Module({
  controllers: [PromiseController],
  providers: [UserService, PromiseService],
})
export class PromiseModule {}
