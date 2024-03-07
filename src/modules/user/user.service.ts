import { Injectable } from '@nestjs/common';
import { Provider, User } from '@prisma/client';

import { InputCreateUserDTO, InputUpdateUserDTO } from '@/modules/user/user.dto';
import { PrismaService } from '@/prisma';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneById(id: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({
      where: {
        id: +id,
        deletedAt: null,
      },
    });
  }

  async findOneByProvider(provider: Provider, providerId: string) {
    return this.prisma.user.findUnique({
      where: {
        identifier: {
          provider,
          providerId,
        },
        deletedAt: null,
      },
    });
  }

  async create(input: InputCreateUserDTO) {
    input.profileUrl ||= `${~~(Math.random() * 10)}`;
    return this.prisma.user.create({ data: input });
  }

  async update(user: User, input: InputUpdateUserDTO) {
    input.profileUrl ||= `${~~(Math.random() * 10)}`;
    return this.prisma.user.update({
      where: { id: user.id },
      data: input,
    });
  }

  async delete(user: User, reason: string) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        leaveReason: reason,
        providerId: null,
      },
    });
  }
}
