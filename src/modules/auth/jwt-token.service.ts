import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';

import { TypedConfigService } from '@/config/env';

export interface JwtAuthTokenPayload {
  sub: number;
}

const algorithm = 'ES256';
const audience = 'promise-app.com';
const issuer = 'api.promise-app.com';

@Injectable()
export class JwtAuthTokenService {
  constructor(private readonly config: TypedConfigService) {}

  generateTokens(payload: JwtAuthTokenPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  generateAccessToken(payload: JwtAuthTokenPayload, expiresIn?: number | string): string {
    return sign(payload, this.config.get('jwt.signKey'), {
      expiresIn: expiresIn ?? this.config.get('jwt.expires.access'),
      algorithm,
      audience,
      issuer,
    });
  }

  generateRefreshToken(payload: JwtAuthTokenPayload, expiresIn?: number | string): string {
    return sign(payload, this.config.get('jwt.signKey'), {
      expiresIn: expiresIn ?? this.config.get('jwt.expires.refresh'),
      algorithm,
      audience,
      issuer: `${issuer}#refresh`,
    });
  }

  verifyAccessToken(token: string): JwtAuthTokenPayload {
    return verify(token, this.config.get('jwt.verifyKey'), {
      algorithms: [algorithm],
      audience,
      issuer,
    }) as unknown as JwtAuthTokenPayload;
  }

  verifyRefreshToken(token: string): JwtAuthTokenPayload {
    return verify(token, this.config.get('jwt.verifyKey'), {
      algorithms: [algorithm],
      audience,
      issuer: `${issuer}#refresh`,
    }) as unknown as JwtAuthTokenPayload;
  }
}
