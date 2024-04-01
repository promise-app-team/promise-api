import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { TypedConfigService } from '@/config/env';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createUserBuilder } from '@/tests/fixtures/builder';
import { createPrismaClient } from '@/tests/prisma';
import { mockJwtService } from '@/tests/services/mocks/jwt.service.mock';

const createUser = createUserBuilder(1e5);
const validId = 1e5 - 1;
const invalidId = 1e5 - 2;

describe(AuthService, () => {
  let authService: AuthService;
  const prisma = createPrismaClient({ logging: false });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: mockJwtService({ validId, invalidId }) },
        { provide: TypedConfigService, useValue: { get() {} } },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  test('should be defined', () => {
    expect(authService).toBeInstanceOf(AuthService);
  });

  describe(AuthService.prototype.authenticate, () => {
    test('should return tokens when called with a valid user', async () => {
      const user = createUser();
      await prisma.user.create({ data: user });
      return expect(authService.authenticate({ id: user.id })).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    test('should throw an error when failed to generate a token', async () => {
      await expect(authService.authenticate({ id: invalidId })).rejects.toEqual(AuthServiceError.AuthTokenFailed);
    });
  });

  describe(AuthService.prototype.refresh, () => {
    test('should return tokens when called with a valid token', async () => {
      const user = createUser({ id: validId });
      await prisma.user.create({ data: user });
      await expect(authService.refresh('valid')).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    test('should throw an error when called with an expired token', async () => {
      await expect(authService.refresh('expired')).rejects.toEqual(AuthServiceError.AuthTokenExpired);
    });

    test('should throw an error when called with an invalid token', async () => {
      await expect(authService.refresh('invalid')).rejects.toEqual(AuthServiceError.AuthTokenInvalid);
    });

    test('should throw an error when called with a token that does not match any user', async () => {
      await expect(authService.refresh('not-found')).rejects.toEqual(AuthServiceError.UserNotFound);
    });

    test('should throw an error when unknown errors occur', async () => {
      await expect(authService.refresh('unknown')).rejects.toEqual(new Error());
    });
  });
});
