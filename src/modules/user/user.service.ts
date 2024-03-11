import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { InputCreateUserDTO, InputUpdateUserDTO } from '@/modules/user/user.dto';
import { PrismaClientError } from '@/prisma/error-handler';
import { UserModel } from '@/prisma/prisma.entity';
import { PrismaService } from '@/prisma/prisma.service';

export enum UserServiceError {
  NotFoundUser = '사용자를 찾을 수 없습니다.',
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneById(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw UserServiceError.NotFoundUser;
    }

    return user;
  }

  async findOneByProvider<P extends Pick<UserModel, 'provider' | 'providerId'>>({
    provider,
    providerId,
  }: P): Promise<User> {
    return this.prisma.user
      .findUniqueOrThrow({
        where: {
          identifier: { provider, providerId },
          deletedAt: null,
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
