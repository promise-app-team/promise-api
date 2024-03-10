import { Prisma } from '@prisma/client';

import { _fixture_validUser } from '@/tests/fixtures/users';
import { MockUserProviderID, MockUserID } from '@/tests/services/mocks/user.service.mock';
import { sleep } from '@/tests/utils/async';
import { mock } from '@/tests/utils/mock';

export const MockPrismaService = mock<any>({
  get user() {
    return {
      async findUnique(input: Prisma.UserFindUniqueArgs) {
        await sleep(100);
        if (typeof input.where.id !== 'undefined') {
          switch (input.where.id) {
            case MockUserID.Valid:
              return _fixture_validUser;
            case MockUserID.NotFound:
              return null;
            default:
              throw new Error();
          }
        }
        if (typeof input.where.identifier?.providerId !== 'undefined') {
          switch (input.where.identifier.providerId) {
            case MockUserProviderID.Valid:
              return _fixture_validUser;
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
            return { ..._fixture_validUser, ...input.update };
          case MockUserProviderID.NotFound:
            return { ..._fixture_validUser, ...input.create };
          default:
            throw new Error();
        }
      },

      async update(input: Prisma.UserUpdateArgs) {
        await sleep(100);
        switch (input.where.id) {
          case MockUserID.Valid:
            return { ..._fixture_validUser, ...input.data };
          case MockUserID.NotFound:
            throw new Prisma.PrismaClientKnownRequestError('', { code: 'P2025', clientVersion: '' });
          default:
            throw new Error();
        }
      },
    };
  },
});
