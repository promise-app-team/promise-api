import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { User } from './entities/user.entity';
import { OAuthController } from './controllers/oauth.controller';
import { OAuthService } from './services/oauth.service';
import { ConfigService } from '@nestjs/config';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppleStrategy } from './strategies/apple.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController, OAuthController],
  providers: [
    UserService,
    OAuthService,
    ConfigService,
    JwtService,
    KakaoStrategy,
    GoogleStrategy,
    AppleStrategy,
  ],
})
export class AuthModule {}
