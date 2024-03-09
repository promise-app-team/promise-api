import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { difference, map, pick, pipe } from 'remeda';

import { HasherService } from '@/common';
import { InputCreatePromiseDTO, InputLocationDTO, PromiseUserRole, PromiseStatus } from '@/modules/promise/promise.dto';
import { PrismaClientError, PrismaService, UserEntity } from '@/prisma';
import { ifs, guard } from '@/utils/guard';

export enum PromiseServiceError {
  NotFoundPromise = '약속을 찾을 수 없습니다.',
  NotFoundStartLocation = '등록한 출발지가 없습니다.',
  AlreadyAttend = '이미 참여한 약속입니다.',
  CannotCancel = '약속장은 약속을 취소할 수 없습니다.',
}

interface PromiseUniqueFilter {
  id?: number;
  pid?: string;
}

interface PromiseFilter {
  status?: PromiseStatus;
  role?: PromiseUserRole;
}

type PromiseFullFilter = PromiseUniqueFilter & PromiseFilter;

@Injectable()
export class PromiseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: HasherService
  ) {}

  #promiseInclude: Prisma.PromiseInclude = {
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
    const exists = await this.prisma.promise.findUnique({
      where: { id: +this.hasher.decode(pid) },
      select: { id: true },
    });
    return !!exists;
  }

  async findAllByUser(user: UserEntity, condition?: PromiseFilter) {
    return this.prisma.promise.findMany({
      where: this.makeFilter(condition ?? {}, user),
      include: this.#promiseInclude,
    });
  }

  /**
   *
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async findOneByPid(pid: string, condition?: PromiseFilter) {
    const user = await this.prisma.promise.findUnique({
      where: this.makeFilter({ pid, ...condition }),
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

    if (!user) {
      throw PromiseServiceError.NotFoundPromise;
    }

    return user;
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
      include: this.#promiseInclude,
    });
  }

  /**
   *
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async update(pid: string, host: UserEntity, input: InputCreatePromiseDTO) {
    return this.prisma.$transaction(async (tx) => {
      const id = +this.hasher.decode(pid);

      const promise = await tx.promise.findUnique({
        where: { id, hostId: host.id },
        select: { id: true, destinationId: true },
      });

      if (!promise) {
        throw PromiseServiceError.NotFoundPromise;
      }

      const themes = await tx.promiseTheme.findMany({
        where: { promiseId: id },
      });

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
                  where: { id: promise.destinationId ?? 0 },
                  create: input.destination,
                  update: input.destination,
                })
              : await guard(
                  async () =>
                    (await tx.location.delete({
                      where: { id: promise.destinationId ?? 0 },
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
        include: this.#promiseInclude,
      });
    });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.NotFoundStartLocation}
   */
  async getStartLocation(pid: string, user: UserEntity) {
    return this.prisma.$transaction(async (tx) => {
      const promiseUser = await tx.promiseUser.findFirst({
        where: { userId: user.id, promiseId: +this.hasher.decode(pid) },
        select: { startLocationId: true },
      });

      if (!promiseUser) {
        throw PromiseServiceError.NotFoundPromise;
      }

      if (!promiseUser.startLocationId) {
        throw PromiseServiceError.NotFoundStartLocation;
      }

      const location = await tx.location.findUnique({
        where: { id: promiseUser.startLocationId },
      });

      if (!location) {
        throw PromiseServiceError.NotFoundStartLocation;
      }

      return location;
    });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.NotFoundStartLocation}
   */
  async updateStartLocation(pid: string, attendee: UserEntity, input: InputLocationDTO) {
    return this.prisma.$transaction(async (tx) => {
      const id = +this.hasher.decode(pid);

      const promiseUser = await tx.promiseUser.findFirst({
        where: { userId: attendee.id, promiseId: id },
        select: { startLocationId: true },
      });

      if (!promiseUser) {
        throw PromiseServiceError.NotFoundPromise;
      }

      if (!promiseUser.startLocationId) {
        throw PromiseServiceError.NotFoundStartLocation;
      }

      return tx.location.upsert({
        where: { id: promiseUser.startLocationId },
        create: input,
        update: input,
      });
    });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.NotFoundStartLocation}
   */
  async deleteStartLocation(pid: string, user: UserEntity) {
    return this.prisma.$transaction(async (tx) => {
      const id = +this.hasher.decode(pid);

      const promiseUser = await tx.promiseUser.findFirst({
        where: { userId: user.id, promiseId: id },
        select: { startLocationId: true },
      });

      if (!promiseUser) {
        throw PromiseServiceError.NotFoundPromise;
      }

      await tx.location.delete({
        where: { id: promiseUser?.startLocationId ?? 0 },
      });
    });
  }

  async attend(pid: string, user: UserEntity) {
    return this.prisma.promiseUser
      .create({
        data: {
          user: {
            connect: {
              id: user.id,
            },
          },
          promise: {
            connect: this.makeFilter({ pid, status: PromiseStatus.AVAILABLE }),
          },
        },
      })
      .then(({ promiseId }) => ({
        pid: this.hasher.encode(promiseId),
      }))
      .catch((error) => {
        switch (PrismaClientError.from(error)?.code) {
          case 'P2002':
            throw PromiseServiceError.AlreadyAttend;
          case 'P2025':
            throw PromiseServiceError.NotFoundPromise;
          default:
            throw error;
        }
      });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.CannotCancel}
   */
  async leave(pid: string, user: UserEntity) {
    return this.prisma.$transaction(async (tx) => {
      const promise = await tx.promise.findUnique({
        where: this.makeFilter({ pid, status: PromiseStatus.AVAILABLE }),
        select: { id: true, hostId: true, promisedAt: true, completedAt: true },
      });

      if (!promise) {
        throw PromiseServiceError.NotFoundPromise;
      }

      if (promise.hostId === user.id) {
        throw PromiseServiceError.CannotCancel;
      }

      await tx.promiseUser.delete({
        where: { identifier: { userId: user.id, promiseId: promise.id } },
      });
    });
  }

  async getThemes() {
    return this.prisma.theme.findMany();
  }

  private makeFilter(condition: PromiseFullFilter, user?: UserEntity): Prisma.PromiseWhereUniqueInput;
  private makeFilter(condition: PromiseFullFilter, user?: UserEntity): Prisma.PromiseWhereInput;
  private makeFilter(condition: PromiseFullFilter, user?: UserEntity) {
    const { pid, status, role } = condition;
    const { id = pid ? +this.hasher.decode(pid) : undefined } = condition;

    const now = new Date();
    return {
      id,

      ...(status &&
        ifs([
          [status === PromiseStatus.AVAILABLE, { promisedAt: { gte: now }, completedAt: null }],
          [status === PromiseStatus.UNAVAILABLE, { OR: [{ promisedAt: { lt: now } }, { completedAt: { not: null } }] }],
        ])),

      ...(role &&
        ifs([
          [role === PromiseUserRole.ALL, { users: { some: { userId: user?.id } } }],
          [role === PromiseUserRole.HOST, { hostId: user?.id }],
          [role === PromiseUserRole.ATTENDEE, { hostId: { not: user?.id }, users: { some: { userId: user?.id } } }],
        ])),
    } as Prisma.PromiseWhereInput | Prisma.PromiseWhereUniqueInput;
  }
}
