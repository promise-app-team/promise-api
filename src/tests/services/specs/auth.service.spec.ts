import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { TypedConfigService } from '@/common';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma';
import { MockJwtService, MockTokenStatus } from '@/tests/services/mocks/jwt.service.mock';
import { MockPrismaService } from '@/tests/services/mocks/prisma.service.mock';
import { MockTypedConfigService } from '@/tests/services/mocks/typed-config.service.mock';
import { MockUserID, MockUserService } from '@/tests/services/mocks/user.service.mock';

describe(AuthService, () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useClass: MockPrismaService },
        { provide: UserService, useClass: MockUserService },
        { provide: TypedConfigService, useClass: MockTypedConfigService },
        { provide: JwtService, useClass: MockJwtService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe(AuthService.prototype.authenticate, () => {
    test('should return tokens when called with a valid user', async () => {
      return expect(authService.authenticate({ id: MockUserID.Valid })).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    test('should throw an error when failed to generate a token', async () => {
      return expect(authService.authenticate({ id: MockUserID.Unknown })).rejects.toEqual(
        AuthServiceError.AuthTokenFailed
      );
    });
  });

  describe(AuthService.prototype.refresh, () => {
    test('should return tokens when called with a valid token', () => {
      expect(authService.refresh(MockTokenStatus.Valid)).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    test('should throw an error when called with an expired token', async () => {
      return expect(authService.refresh(MockTokenStatus.Expired)).rejects.toEqual(AuthServiceError.AuthTokenExpired);
    });

    test('should throw an error when called with an invalid token', async () => {
      return expect(authService.refresh(MockTokenStatus.Invalid)).rejects.toEqual(AuthServiceError.AuthTokenInvalid);
    });

    test('should throw an error when called with a token that does not match any user', async () => {
      return expect(authService.refresh(MockTokenStatus.NotFound)).rejects.toEqual(AuthServiceError.UserNotFound);
    });

    test('should throw an error when unknown errors occur', async () => {
      return expect(authService.refresh(MockTokenStatus.Unknown)).rejects.toEqual(new Error());
    });
  });
});
