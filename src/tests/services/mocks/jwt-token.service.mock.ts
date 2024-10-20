import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

import type { JwtAuthTokenPayload } from '@/modules/auth'

export const mockJwtAuthTokenService = (context: { validId: number, invalidId: number }) => ({
  generateTokens(payload: JwtAuthTokenPayload) {
    if (payload.sub === context.invalidId) {
      throw new Error()
    }

    return {
      accessToken: 'token',
      refreshToken: 'token',
    }
  },

  generateAccessToken(payload: JwtAuthTokenPayload): string {
    if (payload.sub === context.invalidId) {
      throw new Error()
    }

    return 'token'
  },

  generateRefreshToken(payload: JwtAuthTokenPayload): string {
    if (payload.sub === context.invalidId) {
      throw new Error()
    }

    return 'token'
  },

  verifyAccessToken(token: string): JwtAuthTokenPayload {
    switch (token) {
      case 'valid':
        return { sub: context.validId }
      case 'invalid':
        throw new JsonWebTokenError('invalid token')
      case 'expired':
        throw new TokenExpiredError('jwt expired', new Date())
      case 'not-found':
        return { sub: 404 }
      default:
        throw new Error()
    }
  },

  verifyRefreshToken(token: string): JwtAuthTokenPayload {
    return this.verifyAccessToken(token)
  },
})
