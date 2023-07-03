import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { User } from './entities/user.entity';
import { OAuthController } from './controllers/oauth.controller';
import { OAuthService } from './services/oauth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { KakaoStrategy } from './strategies/kakao.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController, OAuthController],
  providers: [
    UserService,
    OAuthService,
    ConfigService,
    JwtService,
    KakaoStrategy,
  ],
})
export class AuthModule {}
