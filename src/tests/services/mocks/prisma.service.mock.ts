import { Prisma } from '@prisma/client';

import { after } from '@/tests/utils/async';

export class PrismaServiceMock {
  get user() {
    return {
      upsert: jest.fn().mockImplementation((_args: Prisma.UserUpsertArgs) => {
        return after(100, {
          id: '1',
        });
      }),
    };
  }
}
