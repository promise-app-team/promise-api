import { Module } from '@nestjs/common';

import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import { UserService } from '@/modules/user/user.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UserService],
})
export class AuthModule {}
