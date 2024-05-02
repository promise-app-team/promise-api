import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { TypedConfigService } from '@/config/env';

export interface JwtAuthTokenPayload {
  sub: number;
}

const algorithm = 'ES256';
const audience = 'promise-app.com';
const issuer = 'api.promise-app.com';

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
      privateKey: this.config.get('jwt.signKey'),
      algorithm,
      audience,
      issuer,
    });
  }

  generateRefreshToken(payload: JwtAuthTokenPayload, expiresIn?: number | string): string {
    return this.jwt.sign(payload, {
      expiresIn: expiresIn ?? this.config.get('jwt.expires.refresh'),
      privateKey: this.config.get('jwt.signKey'),
      algorithm,
      audience,
      issuer: `${issuer}#refresh`,
    });
  }

  verifyAccessToken(token: string): JwtAuthTokenPayload {
    return this.jwt.verify(token, {
      publicKey: this.config.get('jwt.verifyKey'),
      algorithms: [algorithm],
      audience,
      issuer,
    });
  }

  verifyRefreshToken(token: string): JwtAuthTokenPayload {
    return this.jwt.verify(token, {
      publicKey: this.config.get('jwt.verifyKey'),
      algorithms: [algorithm],
      audience,
      issuer: `${issuer}#refresh`,
    });
  }
}
