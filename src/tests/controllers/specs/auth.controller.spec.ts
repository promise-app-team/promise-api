import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { pick } from 'remeda';

import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { UserService } from '@/modules/user/user.service';
import { _fixture_validUser } from '@/tests/fixtures/users';
import { MockAuthService } from '@/tests/services/mocks/auth.service.mock';
import { MockTokenStatus } from '@/tests/services/mocks/jwt.service.mock';
import { MockUserProviderID, MockUserService } from '@/tests/services/mocks/user.service.mock';

describe(AuthController, () => {
  let authController: AuthController;
  let mockAuthService: AuthService;
  let mockUserService: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: MockAuthService },
        { provide: UserService, useValue: MockUserService },
      ],
    }).compile();

    authController = module.get(AuthController);
    mockAuthService = module.get(AuthService);
    mockUserService = module.get(UserService);
  });

  test('should be defined', () => {
    expect(authController).toBeDefined();
    expect(mockAuthService).toBeDefined();
    expect(mockUserService).toBeDefined();
  });

  describe(AuthController.prototype.login, () => {
    const input = pick(_fixture_validUser, ['username', 'profileUrl', 'provider', 'providerId']);

    test('should return tokens when called with a valid user', async () => {
      await expect(authController.login(input)).resolves.toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });

      expect(mockUserService.upsert).toHaveBeenCalledTimes(1);
      expect(mockAuthService.authenticate).toHaveBeenCalledTimes(1);
    });

    test('should throw an error when failed to authenticate', async () => {
      await expect(authController.login({ ...input, providerId: MockUserProviderID.Unknown })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });

      expect(mockAuthService.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe(AuthController.prototype.refreshTokens, () => {
    test('should return tokens when called with a valid token', async () => {
      await expect(authController.refreshTokens({ refreshToken: MockTokenStatus.Valid })).resolves.toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });

      expect(mockAuthService.refresh).toHaveBeenCalledTimes(1);
    });

    test('should throw an error when called with an expired token', async () => {
      return expect(authController.refreshTokens({ refreshToken: MockTokenStatus.Expired })).rejects.toMatchObject({
        message: AuthServiceError.AuthTokenExpired,
        status: HttpStatus.BAD_REQUEST,
      });
    });

    test('should throw an error when called with an invalid token', async () => {
      return expect(authController.refreshTokens({ refreshToken: MockTokenStatus.Invalid })).rejects.toMatchObject({
        message: AuthServiceError.AuthTokenInvalid,
        status: HttpStatus.BAD_REQUEST,
      });
    });

    test('should throw an error when called with an not-found error', async () => {
      return expect(authController.refreshTokens({ refreshToken: MockTokenStatus.NotFound })).rejects.toMatchObject({
        message: AuthServiceError.UserNotFound,
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when called with an unknown token', async () => {
      return expect(authController.refreshTokens({ refreshToken: MockTokenStatus.Unknown })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});
