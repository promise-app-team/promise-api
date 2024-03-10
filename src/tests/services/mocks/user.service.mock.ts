import { User } from '@prisma/client';

import { InputCreateUserDTO, InputUpdateUserDTO } from '@/modules/user/user.dto';
import { UserService, UserServiceError } from '@/modules/user/user.service';
import { Provider } from '@/prisma';
import { users } from '@/tests/services/fixtures/users';
import { after } from '@/tests/utils/async';
import { MethodTypes } from '@/types';

export class UserServiceMock implements MethodTypes<UserService> {
  async findOneById(id: string): Promise<User> {
    const user = users.find((user) => user.id === +id);
    if (!user) {
      throw UserServiceError.NotFoundUser;
    }
    return after(100, user);
  }

  async findOneByProvider(provider: Provider, providerId: string): Promise<User> {
    const user = users.find((user) => user.provider === provider && user.providerId === providerId);
    if (!user) {
      throw UserServiceError.NotFoundUser;
    }
    return after(100, user);
  }

  async create(input: InputCreateUserDTO): Promise<User> {
    return after(100, {
      id: 1,
      username: input.username,
      profileUrl: input.profileUrl,
      provider: input.provider,
      providerId: input.providerId,
      deletedAt: null,
      leaveReason: null,
      lastSignedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async update(user: User, input: InputUpdateUserDTO): Promise<User> {
    return after(100, {
      ...user,
      ...input,
      updatedAt: new Date(),
    });
  }

  async delete(user: User, reason: string): Promise<User> {
    return after(100, {
      ...user,
      providerId: null,
      deletedAt: new Date(),
      leaveReason: reason,
      updatedAt: new Date(),
    });
  }
}
