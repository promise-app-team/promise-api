import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserService } from '../user/user.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthTokenService } from './jwt-token.service';

@Global()
@Module({
  imports: [JwtModule],
  controllers: [AuthController],
  providers: [JwtAuthTokenService, AuthService, UserService],
  exports: [JwtAuthTokenService],
})
export class AuthModule {}
