import { Injectable } from '@nestjs/common';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';

import { TypedConfigService } from '@/common';
import { AuthTokenDTO } from '@/modules/auth/auth.dto';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma';

export enum AuthServiceError {
  AuthTokenFailed = '토큰 생성에 실패했습니다.',
  AuthTokenExpired = '토큰이 만료되었습니다.',
  AuthTokenInvalid = '유효하지 않은 토큰입니다.',
  UserNotFound = '사용자를 찾을 수 없습니다.',
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly user: UserService,
    private readonly config: TypedConfigService,
    private readonly jwt: JwtService
  ) {}

  /**
   * 사용자를 인증하고 토큰을 발행합니다.
   *
   * @param user user object
   * @returns access token and refresh token
   *
   * @throws {AuthServiceError.AuthTokenFailed} when the token generation fails
   */
  async authenticate(user: { id: number }): Promise<AuthTokenDTO> {
    return this.#generateToken({ id: `${user.id}` }).catch(() => {
      throw AuthServiceError.AuthTokenFailed;
    });
  }

  /**
   * 새로운 토큰을 발행합니다.
   *
   * @param token refresh token (valid, non-expired)
   * @returns new access token and refresh token
   *
   * @throws {AuthServiceError.AuthTokenExpired} when the token is expired
   * @throws {AuthServiceError.AuthTokenInvalid} when the token is invalid
   * @throws {AuthServiceError.UserNotFound} when the user is not found
   */
  async refresh(token: string): Promise<AuthTokenDTO> {
    // TODO: AuthToken 모듈로 분리
    try {
      const payload = this.jwt.verify(token);
      const node = await this.user.findOneById(+payload.id);
      return this.#generateToken({ id: `${node.id}` });
    } catch (error) {
      if (error instanceof TokenExpiredError) throw AuthServiceError.AuthTokenExpired;
      if (error instanceof JsonWebTokenError) throw AuthServiceError.AuthTokenInvalid;
      throw error;
    }
  }

  // TODO: AuthToken 모듈로 분리
  async #generateToken(payload: object) {
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('jwt.expires.access'),
    });
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('jwt.expires.refresh'),
    });
    return { accessToken, refreshToken };
  }
}
