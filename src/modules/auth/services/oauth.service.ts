import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { OAuthRequestUser } from '../types/oauth';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class OAuthService {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: OAuthRequestUser) {
    const node = await this.userService
      .findOneByProvider(user.provider, user.providerId)
      .then((node) => node ?? this.userService.create(user));

    const payload = { id: `${node.id}` };
    const secret = this.configService.get('JWT_SECRET_KEY');

    // TODO: AuthToken 모듈로 분리
    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }
}
