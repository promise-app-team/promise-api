import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { TypedConfigService } from '@/config/env';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createUserBuilder } from '@/tests/fixtures/users';
import { createPrismaClient } from '@/tests/prisma';
import { mockJwtService } from '@/tests/services/mocks/jwt.service.mock';

const createUser = createUserBuilder(1e6);
const validId = 1e6 - 1;
const invalidId = 1e6 - 2;

describe(AuthController, () => {
  let authController: AuthController;
  const prisma = createPrismaClient({ logging: false });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        UserService,
        { provide: TypedConfigService, useValue: { get() {} } },
        { provide: JwtService, useValue: mockJwtService({ validId, invalidId }) },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    authController = module.get(AuthController);
  });

  test('should be defined', () => {
    expect(authController).toBeInstanceOf(AuthController);
  });

  describe(AuthController.prototype.login, () => {
    test('should return tokens when called with a valid user', async () => {
      const user = createUser();
      await prisma.user.create({ data: user });
      await expect(authController.login(user)).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    test('should throw an error when unknown error occurs', async () => {
      const unknownError = createUser({ id: invalidId });
      await expect(authController.login(unknownError)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(AuthController.prototype.refreshTokens, () => {
    test('should return tokens when called with a valid token', async () => {
      const user = createUser({ id: validId });
      await prisma.user.create({ data: user });
      await expect(authController.refreshTokens({ refreshToken: 'valid' })).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    test('should throw an error when called with an expired token', async () => {
      await expect(authController.refreshTokens({ refreshToken: 'expired' })).rejects.toMatchObject({
        message: AuthServiceError.AuthTokenExpired,
        status: HttpStatus.BAD_REQUEST,
      });
    });

    test('should throw an error when called with an invalid token', async () => {
      return expect(authController.refreshTokens({ refreshToken: 'invalid' })).rejects.toMatchObject({
        message: AuthServiceError.AuthTokenInvalid,
        status: HttpStatus.BAD_REQUEST,
      });
    });

    test('should throw an error when called with an not-found error', async () => {
      return expect(authController.refreshTokens({ refreshToken: 'not-found' })).rejects.toMatchObject({
        message: AuthServiceError.UserNotFound,
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when called with an unknown token', async () => {
      return expect(authController.refreshTokens({ refreshToken: 'unknown' })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});
