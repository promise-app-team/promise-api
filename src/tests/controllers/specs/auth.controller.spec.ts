import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { TypedConfigService } from '@/config/env';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { userBuilder } from '@/tests/fixtures/users';
import { JWT_INVALID_ID, JWT_VALID_ID, mockJwtService } from '@/tests/services/mocks/jwt.service.mock';

const makeUser = userBuilder(10e4);

describe(AuthController, () => {
  let authController: AuthController;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        UserService,
        { provide: TypedConfigService, useValue: { get() {} } },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    authController = module.get(AuthController);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  test('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe(AuthController.prototype.login, () => {
    test('should return tokens when called with a valid user', async () => {
      const user = makeUser();
      await prisma.user.create({ data: user });
      await expect(authController.login(user)).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    test('should throw an error when unknown error occurs', async () => {
      const unknownError = makeUser(JWT_INVALID_ID);
      await expect(authController.login(unknownError)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(AuthController.prototype.refreshTokens, () => {
    test('should return tokens when called with a valid token', async () => {
      const user = makeUser(JWT_VALID_ID);
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
