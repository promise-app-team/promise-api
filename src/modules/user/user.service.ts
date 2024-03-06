import { PrismaService } from '@/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma, Provider, User } from '@prisma/client';

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

  async create(user: Prisma.UserCreateInput) {
    user.profileUrl ||= `${~~(Math.random() * 10)}`;
    return this.prisma.user.create({ data: user });
  }

  async update(user: User, input: Prisma.UserUpdateInput) {
    user.profileUrl ||= `${~~(Math.random() * 10)}`;
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
