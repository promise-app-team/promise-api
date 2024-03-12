import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';

import { partialMock } from '@/tests/utils/mock';

export const JWT_VALID_ID = 1;
export const JWT_INVALID_ID = 404040;

export const mockJwtService = partialMock<JwtService>({
  sign(payload: any): string {
    const id = +payload.id;
    if (id !== JWT_INVALID_ID) {
      return 'token';
    }
    throw new Error();
  },

  verify(token: string): any {
    switch (token) {
      case 'valid':
        return { id: JWT_VALID_ID };
      case 'invalid':
        throw new JsonWebTokenError('invalid token');
      case 'expired':
        throw new TokenExpiredError('jwt expired', new Date());
      case 'not-found':
        return { id: 404 };
      default:
        throw new Error();
    }
  },
});
