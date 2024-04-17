import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';

export const mockJwtService = (context: { validId: number; invalidId: number }) => ({
  sign(payload: any): string {
    const id = +payload.id;
    if (id !== context.invalidId) {
      return 'token';
    }
    throw new Error();
  },

  verify(token: string): any {
    switch (token) {
      case 'valid':
        return { id: context.validId };
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
