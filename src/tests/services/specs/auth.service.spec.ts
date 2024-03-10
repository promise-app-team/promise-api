import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { TypedConfigService } from '@/common';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { UserService } from '@/modules/user/user.service';
import { PrismaService, Provider } from '@/prisma';
import { JwtServiceMock } from '@/tests/services/mocks/jwt.service.mock';
import { PrismaServiceMock } from '@/tests/services/mocks/prisma.service.mock';
import { TypedConfigServiceMock } from '@/tests/services/mocks/typed-config.service.mock';
import { UserServiceMock } from '@/tests/services/mocks/user.service.mock';

describe(AuthService, () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useClass: PrismaServiceMock },
        { provide: UserService, useClass: UserServiceMock },
        { provide: TypedConfigService, useClass: TypedConfigServiceMock },
        { provide: JwtService, useClass: JwtServiceMock },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe(AuthService.prototype.authenticate, () => {
    test("should return tokens when called with a valid user's information", async () => {
      return expect(
        authService.authenticate({
          username: 'username',
          profileUrl: 'http://profile.url',
          provider: Provider.KAKAO,
          providerId: '1234',
        })
      ).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });
  });

  describe(AuthService.prototype.refresh, () => {
    test('should return tokens when called with a valid token', () => {
      expect(authService.refresh('token')).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    test('should throw an error when called with an expired token', async () => {
      return expect(authService.refresh('expired')).rejects.toEqual(AuthServiceError.AuthTokenExpired);
    });

    test('should throw an error when called with an invalid token', async () => {
      return expect(authService.refresh('invalid')).rejects.toEqual(AuthServiceError.AuthTokenInvalid);
    });

    test('should throw an error when called with a token that does not match any user', async () => {
      return expect(authService.refresh('not-found')).rejects.toEqual(AuthServiceError.UserNotFound);
    });
  });
});
