import { Test } from '@nestjs/testing'

import { TypedConfigService } from '@/config/env'
import { LoggerService } from '@/customs/logger'
import { WinstonLoggerService } from '@/customs/winston-logger'
import { AuthService, AuthServiceError, JwtAuthTokenService } from '@/modules/auth'
import { UserService } from '@/modules/user'
import { PrismaService } from '@/prisma'
import { createTestFixture } from '@/tests/fixtures'
import { mockJwtAuthTokenService } from '@/tests/services/mocks/jwt-token.service.mock'
import { createPrismaClient } from '@/tests/setups/prisma'

describe(AuthService, () => {
  let authService: AuthService
  const prisma = createPrismaClient({ logging: false })
  const fixture = createTestFixture(prisma, { from: 1e5, to: 1e6 })
  const validId = 1e5 - 1
  const invalidId = 1e5 - 2

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: WinstonLoggerService },
        { provide: JwtAuthTokenService, useValue: mockJwtAuthTokenService({ validId, invalidId }) },
        { provide: TypedConfigService, useValue: { get() {} } },
      ],
    }).compile()

    authService = module.get(AuthService)
  })

  test('should be defined', () => {
    expect(authService).toBeInstanceOf(AuthService)
  })

  describe(AuthService.prototype.authenticate, () => {
    test('should return tokens when called with a valid user', async () => {
      const user = await fixture.write.user.output()
      return expect(authService.authenticate({ id: user.id })).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      })
    })

    test('should throw an error when failed to generate a token', async () => {
      await expect(authService.authenticate({ id: invalidId })).rejects.toEqual(AuthServiceError.AuthTokenFailed)
    })
  })

  describe(AuthService.prototype.refresh, () => {
    test('should return tokens when called with a valid token', async () => {
      await fixture.write.user({ id: validId })
      await expect(authService.refresh('valid')).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      })
    })

    test('should throw an error when called with an expired token', async () => {
      await expect(authService.refresh('expired')).rejects.toEqual(AuthServiceError.AuthTokenExpired)
    })

    test('should throw an error when called with an invalid token', async () => {
      await expect(authService.refresh('invalid')).rejects.toEqual(AuthServiceError.AuthTokenInvalid)
    })

    test('should throw an error when called with a token that does not match any user', async () => {
      await expect(authService.refresh('not-found')).rejects.toEqual(AuthServiceError.UserNotFound)
    })

    test('should throw an error when unknown errors occur', async () => {
      await expect(authService.refresh('unknown')).rejects.toEqual(new Error())
    })
  })
})
