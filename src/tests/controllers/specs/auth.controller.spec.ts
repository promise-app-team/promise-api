import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { Provider } from '@/prisma';
import { AuthServiceMock } from '@/tests/services/mocks/auth.service.mock';

describe(AuthController, () => {
  let authController: AuthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useClass: AuthServiceMock }],
    }).compile();

    authController = module.get(AuthController);
  });

  describe(AuthController.prototype.login, () => {
    test('should return tokens when called with a valid user', () => {
      expect(
        authController.login({
          username: 'username',
          profileUrl: 'http://profile.url',
          provider: Provider.APPLE,
          providerId: '1234',
        })
      ).resolves.toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });
    });
  });

  describe(AuthController.prototype.refreshTokens, () => {
    test('should return tokens when called with a valid token', async () => {
      return expect(authController.refreshTokens({ refreshToken: 'token' })).resolves.toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });
    });

    test('should throw an error when called with an expired token', async () => {
      return expect(authController.refreshTokens({ refreshToken: 'expired' })).rejects.toMatchObject({
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
