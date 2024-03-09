import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { TypedConfigService } from '@/common';
import { AuthTokenDTO } from '@/modules/auth/auth.dto';
import { InputCreateUserDTO } from '@/modules/user/user.dto';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma';

export enum AuthServiceError {
  AuthTokenExpired = '토큰이 만료되었습니다.',
  InvalidAuthToken = '유효하지 않은 토큰입니다.',
  UnexpectedError = '예상치 못한 오류가 발생했습니다.',
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly user: UserService,
    private readonly config: TypedConfigService,
    private readonly jwt: JwtService
  ) {}

  async authenticate(input: InputCreateUserDTO): Promise<AuthTokenDTO> {
    const { provider, providerId } = input;
    const signedUser = await this.prisma.user.upsert({
      where: { identifier: { provider, providerId } },
      update: { lastSignedAt: new Date() },
      create: input,
    });

    return this._generateToken({ id: `${signedUser.id}` });
  }

  async refresh(token: string): Promise<AuthTokenDTO> {
    // TODO: AuthToken 모듈로 분리
    try {
      const payload = this.jwt.verify(token);
      const node = await this.user.findOneById(payload.id);
      if (!node) throw new Error('로그인을 실패했습니다.');
      return this._generateToken({ id: `${node.id}` });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.name) {
          case 'TokenExpiredError':
            throw AuthServiceError.AuthTokenExpired;
          case 'JsonWebTokenError':
            throw AuthServiceError.InvalidAuthToken;
        }
      }
      throw AuthServiceError.UnexpectedError;
    }
  }

  // TODO: AuthToken 모듈로 분리
  async _generateToken(payload: object) {
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('jwt.expires.access'),
    });
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('jwt.expires.refresh'),
    });
    return { accessToken, refreshToken };
  }
}
