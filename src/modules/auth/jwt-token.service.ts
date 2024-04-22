import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { TypedConfigService } from '@/config/env';

export interface JwtAuthTokenPayload {
  sub: number;
}

@Injectable()
export class JwtAuthTokenService {
  constructor(
    private readonly config: TypedConfigService,
    private readonly jwt: JwtService
  ) {}

  generateTokens(payload: JwtAuthTokenPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  generateAccessToken(payload: JwtAuthTokenPayload, expiresIn?: number | string): string {
    return this.jwt.sign(payload, {
      expiresIn: expiresIn ?? this.config.get('jwt.expires.access'),
    });
  }

  generateRefreshToken(payload: JwtAuthTokenPayload, expiresIn?: number | string): string {
    return this.jwt.sign(payload, {
      expiresIn: expiresIn ?? this.config.get('jwt.expires.refresh'),
    });
  }

  verifyToken(token: string): JwtAuthTokenPayload {
    return this.jwt.verify(token);
  }
}
