import { Prisma } from '@prisma/client';

import { user } from '@/tests/services/fixtures/users';
import { MockUserProviderID, MockUserID } from '@/tests/services/mocks/user.service.mock';
import { sleep } from '@/tests/utils/async';

export class MockPrismaService {
  get user() {
    return {
      async findUnique(input: Prisma.UserFindUniqueArgs) {
        await sleep(100);
        if (typeof input.where.id !== 'undefined') {
          switch (input.where.id) {
            case MockUserID.Valid:
              return user;
            case MockUserID.NotFound:
              return null;
            default:
              throw new Error();
          }
        }
        if (typeof input.where.identifier?.providerId !== 'undefined') {
          switch (input.where.identifier.providerId) {
            case MockUserProviderID.Valid:
              return user;
            case MockUserProviderID.NotFound:
              return null;
            default:
              throw new Error();
          }
        }
        throw new Error();
      },

      async upsert(input: Prisma.UserUpsertArgs) {
        await sleep(100);
        switch (input.where.identifier?.providerId) {
          case MockUserProviderID.Valid:
            return { ...user, ...input.update };
          case MockUserProviderID.NotFound:
            return { ...user, ...input.create };
          default:
            throw new Error();
        }
      },

      async update(input: Prisma.UserUpdateArgs) {
        await sleep(100);
        switch (input.where.id) {
          case MockUserID.Valid:
            return { ...user, ...input.data };
          case MockUserID.NotFound:
            throw new Prisma.PrismaClientKnownRequestError('', { code: 'P2025', clientVersion: '' });
          default:
            throw new Error();
        }
      },
    };
  }
}
