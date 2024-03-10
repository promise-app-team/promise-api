import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';

import { MockUserID } from '@/tests/services/mocks/user.service.mock';
import { partialMock } from '@/tests/utils/mock';

export enum MockTokenStatus {
  Valid = 'valid',
  Invalid = 'invalid',
  Expired = 'expired',
  NotFound = 'not-found',
  Unknown = 'unknown',
}

export const MockJwtService = partialMock<JwtService>({
  sign(payload: any): string {
    const id = +payload.id;

    switch (id) {
      case MockUserID.Valid:
        return 'token';
      default:
        throw new Error();
    }
  },

  verify(token: MockTokenStatus): any {
    switch (token) {
      case MockTokenStatus.Valid:
        return { id: `${MockUserID.Valid}` };
      case MockTokenStatus.Invalid:
        throw new JsonWebTokenError('invalid token');
      case MockTokenStatus.Expired:
        throw new TokenExpiredError('jwt expired', new Date());
      case MockTokenStatus.NotFound:
        return { id: `${MockUserID.NotFound}` };
      default:
        throw new Error();
    }
  },
});
