import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isPast } from 'date-fns';
import { difference, map, pick, pipe } from 'remeda';

import { HasherService } from '@/common';
import { InputCreatePromiseDTO, InputLocationDTO } from '@/modules/promise/promise.dto';
import { PrismaService, UserEntity } from '@/prisma';
import { ifs, guard } from '@/utils/guard';

@Injectable()
export class PromiseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: HasherService
  ) {}

  private promiseInclude: Prisma.PromiseInclude = {
    host: {
      select: {
        id: true,
        username: true,
        profileUrl: true,
      },
    },
    users: {
      select: { user: true },
    },
    themes: {
      select: { theme: true },
    },
    destination: true,
  };

  async exists(pid: string): Promise<boolean> {
    const id = +this.hasher.decode(pid);
    const exists = await this.prisma.promise.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!exists;
  }

  async findAllByUser(user: UserEntity, status?: 'all' | 'available' | 'unavailable') {
    const now = new Date();
    return this.prisma.promise.findMany({
      where: {
        users: {
          some: {
            userId: user.id,
          },
        },
        promisedAt: ifs([
          [status === 'available', { gt: now }],
          [status === 'unavailable', { lt: now }],
        ]),
      },
      include: this.promiseInclude,
    });
  }

  async findOneByPid(pid: string) {
    const id = +this.hasher.decode(pid);
    return this.prisma.promise.findUniqueOrThrow({
      where: { id },
      include: {
        themes: {
          select: { theme: true },
        },
        host: {
          select: {
            id: true,
            username: true,
            profileUrl: true,
          },
        },
        destination: true,
        users: {
          select: { user: true },
        },
      },
    });
  }

  async create(host: UserEntity, input: InputCreatePromiseDTO) {
    return this.prisma.promise.create({
      data: {
        ...pick(input, [
          'title',
          'destinationType',
          'locationShareStartType',
          'locationShareStartValue',
          'locationShareEndType',
          'locationShareEndValue',
          'promisedAt',
        ]),
        host: {
          connect: {
            id: host.id,
          },
        },
        users: {
          create: {
            userId: host.id,
          },
        },
        themes: {
          createMany: {
            data: input.themeIds.map((themeId) => ({ themeId })),
          },
        },
        destination: input.destination
          ? {
              create: input.destination,
            }
          : undefined,
      },
      include: this.promiseInclude,
    });
  }

  async update(pid: string, host: UserEntity, input: InputCreatePromiseDTO) {
    return this.prisma.$transaction(async (tx) => {
      const id = +this.hasher.decode(pid);

      const [themes, dest] = await Promise.all([
        tx.promiseTheme.findMany({
          where: { promiseId: id },
        }),
        tx.promise.findUnique({
          where: { id, hostId: host.id },
          select: { destinationId: true },
        }),
      ]);

      return tx.promise.update({
        where: { id, hostId: host.id },
        data: {
          ...pick(input, [
            'title',
            'destinationType',
            'locationShareStartType',
            'locationShareStartValue',
            'locationShareEndType',
            'locationShareEndValue',
            'promisedAt',
          ]),
          themes: {
            deleteMany: {
              themeId: {
                in: pipe(
                  themes,
                  map((theme) => theme.themeId),
                  difference(input.themeIds)
                ),
              },
            },
            createMany: {
              data: pipe(
                input.themeIds,
                difference(map(themes, (theme) => theme.themeId)),
                map((themeId) => ({ themeId }))
              ),
            },
          },
          destination: {
            connect: input.destination
              ? await tx.location.upsert({
                  where: { id: dest?.destinationId ?? 0 },
                  create: input.destination,
                  update: input.destination,
                })
              : await guard(
                  async () =>
                    (await tx.location.delete({
                      where: { id: dest?.destinationId ?? 0 },
                    })) && undefined
                ),
          },
          // TODO: https://github.com/prisma/prisma/issues/4072#issue-731421569
          // destination: input.destination
          //   ? {
          //       upsert: {
          //         create: input.destination,
          //         update: input.destination,
          //       },
          //     }
          //   : {
          //       delete: true,
          //     },
        },
        include: this.promiseInclude,
      });
    });
  }

  async getStartLocation(pid: string, user: UserEntity) {
    return this.prisma.promiseUser
      .findFirstOrThrow({
        where: { userId: user.id, promiseId: +this.hasher.decode(pid) },
        include: { startLocation: true },
      })
      .then(({ startLocation }) => startLocation);
  }

  async updateStartLocation(pid: string, attendee: UserEntity, input: InputLocationDTO) {
    return this.prisma.promiseUser
      .update({
        where: { identifier: { userId: attendee.id, promiseId: +this.hasher.decode(pid) } },
        data: {
          startLocation: {
            upsert: {
              create: input,
              update: input,
            },
          },
        },
        include: { startLocation: true },
      })
      .then(({ startLocation }) => startLocation);
  }

  async deleteStartLocation(pid: string, user: UserEntity) {
    return this.prisma.$transaction(async (tx) => {
      const id = +this.hasher.decode(pid);

      const promiseUser = await tx.promiseUser.findFirst({
        where: { userId: user.id, promiseId: id },
        select: { startLocationId: true },
      });

      await tx.location.delete({
        where: { id: promiseUser?.startLocationId ?? 0 },
      });
    });
  }

  async attend(pid: string, user: UserEntity) {
    return this.prisma.$transaction(async (tx) => {
      const id = +this.hasher.decode(pid);

      const promise = await tx.promise.findUniqueOrThrow({
        where: { id },
        select: { promisedAt: true, completedAt: true },
      });

      if (this.isExpired(promise)) {
        throw new Error('만료된 약속은 참여할 수 없습니다.');
      }

      const promiseUser = await tx.promiseUser.findUnique({
        where: { identifier: { userId: user.id, promiseId: id } },
      });

      if (promiseUser) {
        throw new Error('이미 참여한 약속입니다.');
      }

      return tx.promiseUser
        .create({
          data: {
            user: {
              connect: { id: user.id },
            },
            promise: {
              connect: { id },
            },
          },
        })
        .then(({ promiseId }) => ({
          pid: this.hasher.encode(promiseId),
        }));
    });
  }

  async leave(pid: string, user: UserEntity) {
    return this.prisma.$transaction(async (tx) => {
      const id = +this.hasher.decode(pid);

      const promise = await tx.promise.findUniqueOrThrow({
        where: { id },
        select: { hostId: true, promisedAt: true, completedAt: true },
      });

      if (this.isExpired(promise)) {
        throw new Error('만료된 약속은 참여를 취소할 수 없습니다.');
      }

      if (promise.hostId === user.id) {
        throw new Error('약속장은 약속을 취소할 수 없습니다.');
      }

      await tx.promiseUser.delete({
        where: { identifier: { userId: user.id, promiseId: id } },
      });
    });
  }

  async themes() {
    return this.prisma.theme.findMany();
  }

  isExpired<T extends { promisedAt: Date; completedAt: Date | null }>(promise: T) {
    return isPast(promise.promisedAt) || !!promise.completedAt;
  }
}
