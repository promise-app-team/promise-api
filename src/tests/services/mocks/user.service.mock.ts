import { User } from '@prisma/client';

import { InputCreateUserDTO, InputUpdateUserDTO } from '@/modules/user/user.dto';
import { UserService, UserServiceError } from '@/modules/user/user.service';
import { Provider } from '@/prisma';
import { user as user1 } from '@/tests/services/fixtures/users';
import { after, sleep } from '@/tests/utils/async';
import { MethodTypes } from '@/types';

export enum MockUserID {
  Valid = 1,
  NotFound = 0,
  Unknown = -1,
}

export enum MockUserProviderID {
  Valid = '1',
  NotFound = '0',
  Unknown = '-1',
}

export class MockUserService implements MethodTypes<UserService> {
  async findOneById(id: MockUserID): Promise<User> {
    await sleep(100);
    switch (id) {
      case MockUserID.Valid:
        return user1;
      case MockUserID.NotFound:
        throw UserServiceError.NotFoundUser;
      default:
        throw new Error();
    }
  }

  async findOneByProvider(provider: Provider, providerId: string): Promise<User> {
    await sleep(100);
    switch (providerId) {
      case MockUserProviderID.Valid:
        return user1;
      case MockUserProviderID.NotFound:
        throw UserServiceError.NotFoundUser;
      default:
        throw new Error();
    }
  }

  async upsert(input: InputCreateUserDTO): Promise<User> {
    await sleep(100);
    switch (input.providerId) {
      case MockUserProviderID.Unknown:
        return { ...user1, id: MockUserID.Unknown };
      default:
        return after(100, user1);
    }
  }

  async update(userId: MockUserID, input: InputUpdateUserDTO): Promise<User> {
    const user = await this.findOneById(userId);
    const result = {
      ...user,
      ...input,
      updatedAt: new Date(),
    };
    result.profileUrl ||= '1';
    return after(100, result);
  }

  async delete(userId: MockUserID, reason: string): Promise<User> {
    const user = await this.findOneById(userId);
    return after(100, {
      ...user,
      providerId: null,
      deletedAt: new Date(),
      leaveReason: reason,
      updatedAt: new Date(),
    });
  }
}
