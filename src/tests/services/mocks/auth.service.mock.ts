import { AuthTokenDTO } from '@/modules/auth/auth.dto';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { InputCreateUserDTO } from '@/modules/user/user.dto';
import { after, sleep } from '@/tests/utils/async';
import { MethodTypes } from '@/types';

export class AuthServiceMock implements MethodTypes<AuthService> {
  async authenticate(_input: InputCreateUserDTO): Promise<AuthTokenDTO> {
    return after(100, {
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    });
  }

  async refresh(token: string): Promise<AuthTokenDTO> {
    await sleep(100);
    switch (token) {
      case 'token':
        return {
          accessToken: 'accessToken',
          refreshToken: 'refreshToken',
        };
      case 'expired':
        throw AuthServiceError.AuthTokenExpired;
      case 'invalid':
        throw AuthServiceError.AuthTokenInvalid;
      case 'not-found':
        throw AuthServiceError.UserNotFound;
      default:
        throw new Error();
    }
  }
}
