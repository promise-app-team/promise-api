import { Injectable } from '@nestjs/common'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

import { UserService } from '../user/user.service'

import { AuthTokenDTO } from './auth.dto'
import { JwtAuthTokenService } from './jwt-token.service'

export enum AuthServiceError {
  AuthTokenFailed = '토큰 생성에 실패했습니다.',
  AuthTokenExpired = '토큰이 만료되었습니다.',
  AuthTokenInvalid = '유효하지 않은 토큰입니다.',
  UserNotFound = '사용자를 찾을 수 없습니다.',
}

@Injectable()
export class AuthService {
  constructor(
    private readonly user: UserService,
    private readonly jwt: JwtAuthTokenService,
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
    try {
      return this.jwt.generateTokens({ sub: user.id })
    }
    catch {
      throw AuthServiceError.AuthTokenFailed
    }
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
    try {
      const payload = this.jwt.verifyRefreshToken(token)
      const node = await this.user.findOneById(payload.sub)
      return this.jwt.generateTokens({ sub: node.id })
    }
    catch (error) {
      if (error instanceof TokenExpiredError) throw AuthServiceError.AuthTokenExpired
      if (error instanceof JsonWebTokenError) throw AuthServiceError.AuthTokenInvalid
      throw error
    }
  }
}
