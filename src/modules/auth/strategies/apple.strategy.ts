import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from '@arendajaelu/nestjs-passport-apple';
import { JwtService } from '@nestjs/jwt';
import { OAuthApplePayload, OAuthApplyUser } from '../types/oauth';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      clientID: config.get('APPLE_CLIENT_ID'),
      teamID: config.get('APPLE_TEAM_ID'),
      keyID: config.get('APPLE_KEY_ID'),
      keyFilePath: config.get('APPLE_SECRET_KEY'),
      callbackURL: `${config.get('API_URL')}/oauth/apple/redirect`,
      scope: ['name', 'email'],
    });
  }

  id(payload: OAuthApplePayload): string | null {
    if (!payload.id_token) return null;
    const decoded = this.jwtService.decode(payload.id_token);
    return typeof decoded === 'string' ? null : decoded['sub'];
  }

  username(payload: OAuthApplePayload): string | null {
    if (!payload.user) return null;
    const { name }: OAuthApplyUser = JSON.parse(payload.user);
    return `${name.firstName} ${name.lastName}`;
  }
}
