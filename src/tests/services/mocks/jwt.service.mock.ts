import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';

import { DeepPartial, MethodTypes } from '@/types';

export class JwtServiceMock implements DeepPartial<MethodTypes<JwtService>> {
  sign(_payload: any, _options?: any): string {
    return 'token';
  }

  verify(token: string): any {
    switch (token) {
      case 'token':
        return { id: '1' };
      case 'expired':
        throw new TokenExpiredError('jwt expired', new Date());
      case 'invalid':
        throw new JsonWebTokenError('invalid token');
      case 'not-found':
        return { id: 'not-found' };
      default:
        throw new Error();
    }
  }
}
