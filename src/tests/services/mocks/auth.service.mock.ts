import { AuthTokenDTO } from '@/modules/auth/auth.dto';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { MockTokenStatus } from '@/tests/services/mocks/jwt.service.mock';
import { MockUserID } from '@/tests/services/mocks/user.service.mock';
import { after, sleep } from '@/tests/utils/async';
import { mock } from '@/tests/utils/mock';

export const MockAuthService = mock<AuthService>({
  async authenticate(user: { id: number }): Promise<AuthTokenDTO> {
    if (user.id !== MockUserID.Valid) throw new Error();

    return after(100, {
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    });
  },

  async refresh(token: MockTokenStatus): Promise<AuthTokenDTO> {
    await sleep(100);
    switch (token) {
      case MockTokenStatus.Valid:
        return {
          accessToken: 'accessToken',
          refreshToken: 'refreshToken',
        };
      case MockTokenStatus.Expired:
        throw AuthServiceError.AuthTokenExpired;
      case MockTokenStatus.Invalid:
        throw AuthServiceError.AuthTokenInvalid;
      case MockTokenStatus.NotFound:
        throw AuthServiceError.UserNotFound;
      default:
        throw new Error();
    }
  },
});
