import { Injectable } from '@nestjs/common';
import { Provider, User } from '@prisma/client';

import { InputCreateUserDTO, InputUpdateUserDTO } from '@/modules/user/user.dto';
import { PrismaClientError } from '@/prisma/error-handler';
import { PrismaService } from '@/prisma/prisma.service';

export enum UserServiceError {
  NotFoundUser = '사용자를 찾을 수 없습니다.',
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneById(userId: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw UserServiceError.NotFoundUser;
    }

    return user;
  }

  async findOneByProvider(provider: Provider, providerId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        identifier: {
          provider,
          providerId,
        },
        deletedAt: null,
      },
    });

    if (!user) {
      throw UserServiceError.NotFoundUser;
    }

    return user;
  }

  async upsert(input: InputCreateUserDTO) {
    const { provider, providerId } = input;
    input.profileUrl ||= `${~~(Math.random() * 10)}`;
    return this.prisma.user.upsert({
      where: { identifier: { provider, providerId } },
      update: { lastSignedAt: new Date() },
      create: input,
    });
  }

  async update(userId: number, input: InputUpdateUserDTO) {
    input.profileUrl ||= `${~~(Math.random() * 10)}`;
    return this.prisma.user
      .update({
        where: { id: userId },
        data: input,
      })
      .catch((error) => {
        switch (PrismaClientError.from(error)?.code) {
          case 'P2025':
            throw UserServiceError.NotFoundUser;
          default:
            throw error;
        }
      });
  }

  async delete(userId: number, reason: string) {
    return this.prisma.user
      .update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          leaveReason: reason,
          providerId: null,
        },
      })
      .catch((error) => {
        switch (PrismaClientError.from(error)?.code) {
          case 'P2025':
            throw UserServiceError.NotFoundUser;
          default:
            throw error;
        }
      });
  }
}
