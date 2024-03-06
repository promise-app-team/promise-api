import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UserService],
})
export class AuthModule {}
