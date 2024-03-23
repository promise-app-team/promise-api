import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { difference, map, pick, pipe } from 'remeda';

import { InputCreatePromiseDTO, InputLocationDTO, PromiseStatus, PromiseUserRole } from './promise.dto';

import { PrismaClientError } from '@/prisma/error-handler';
import { LocationModel, ThemeModel } from '@/prisma/prisma.entity';
import { PrismaService } from '@/prisma/prisma.service';

export enum PromiseServiceError {
  NotFoundPromise = '약속을 찾을 수 없습니다.',
  NotFoundStartLocation = '등록한 출발지가 없습니다.',
  AlreadyAttend = '이미 참여한 약속입니다.',
  HostChangeOnly = '약속장만 약속을 수정할 수 있습니다.',
  HostDoNotCancel = '약속장은 약속을 취소할 수 없습니다.',
}

type PromiseOptionalFilter = {
  id?: number;
  status?: PromiseStatus;
};

type PromiseFilter =
  | PromiseOptionalFilter
  | (PromiseOptionalFilter & {
      role: PromiseUserRole;
      userId: number;
    });

const promiseInclude: Prisma.PromiseInclude = {
  host: {
    select: {
      id: true,
      username: true,
      profileUrl: true,
    },
  },
  users: {
    select: { user: true, startLocationId: true },
  },
  themes: {
    select: { theme: true },
  },
  destination: true,
};

export type PromiseResult = Prisma.PromiseGetPayload<{ include: typeof promiseInclude }>;

@Injectable()
export class PromiseService {
  constructor(private readonly prisma: PrismaService) {}

  async exists(id: number, condition?: PromiseFilter): Promise<boolean> {
    const exists = await this.prisma.promise.findUnique({
      where: this.#makeFilter({ id, ...condition }),
      select: { id: true },
    });
    return !!exists;
  }

  async findAllByUser(userId: number, condition?: PromiseFilter): Promise<PromiseResult[]> {
    return this.prisma.promise.findMany({
      where: this.#makeFilter(condition),
      include: promiseInclude,
    });
  }

  /**
   *
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async findOneById(id: number, condition?: PromiseFilter): Promise<PromiseResult> {
    const user = await this.prisma.promise.findUnique({
      where: this.#makeFilter({ id, ...condition }),
      include: promiseInclude,
    });

    if (!user) {
      throw PromiseServiceError.NotFoundPromise;
    }

    return user;
  }

  async create(userId: number, input: InputCreatePromiseDTO): Promise<PromiseResult> {
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
            id: userId,
          },
        },
        users: {
          create: {
            userId,
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
      include: promiseInclude,
    });
  }

  /**
   *
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async update(id: number, hostId: number, input: InputCreatePromiseDTO): Promise<PromiseResult> {
    const promise = await this.prisma.promise.findUnique({
      where: { id, hostId },
      select: { id: true, destinationId: true },
    });

    if (!promise) {
      throw PromiseServiceError.HostChangeOnly;
    }

    const themes = await this.prisma.promiseTheme.findMany({
      where: { promiseId: id },
    });

    const destination = await this.prisma.location.findUnique({
      where: { id: promise.destinationId ?? 0 },
    });

    return this.prisma.promise.update({
      where: { id, hostId },
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
        destination: input.destination
          ? {
              upsert: {
                create: input.destination,
                update: input.destination,
              },
            }
          : {
              delete: !!destination,
            },
      },
      include: promiseInclude,
    });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.NotFoundStartLocation}
   */
  async getStartLocation(id: number, userId: number): Promise<LocationModel> {
    const promise = await this.findOneById(id, { role: PromiseUserRole.HOST, status: PromiseStatus.AVAILABLE });

    const promiseUser = await this.prisma.promiseUser.findFirst({
      where: { userId, promiseId: promise.id },
      include: { startLocation: true },
    });

    if (!promiseUser) {
      throw PromiseServiceError.NotFoundPromise;
    }

    if (!promiseUser.startLocationId) {
      throw PromiseServiceError.NotFoundStartLocation;
    }

    const location = await this.prisma.location.findUnique({
      where: { id: promiseUser.startLocationId },
    });

    if (!location) {
      throw PromiseServiceError.NotFoundStartLocation;
    }

    return location;
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async updateStartLocation(id: number, attendeeId: number, input: InputLocationDTO): Promise<LocationModel> {
    const promise = await this.findOneById(id, { role: PromiseUserRole.HOST, status: PromiseStatus.AVAILABLE });

    const promiseUser = await this.prisma.promiseUser.findFirst({
      where: { userId: attendeeId, promiseId: promise.id },
      select: { startLocationId: true },
    });
    if (!promiseUser) {
      throw PromiseServiceError.NotFoundPromise;
    }

    return this.prisma.location.upsert({
      where: { id: promiseUser.startLocationId ?? 0 },
      create: input,
      update: input,
    });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.NotFoundStartLocation}
   */
  async deleteStartLocation(id: number, userId: number): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const promiseUser = await tx.promiseUser.findFirst({
        where: { userId, promiseId: id },
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

  async attend(id: number, userId: number): Promise<{ id: number }> {
    return this.prisma.promiseUser
      .create({
        data: {
          user: {
            connect: {
              id: userId,
            },
          },
          promise: {
            connect: this.#makeFilter({ id, status: PromiseStatus.AVAILABLE }),
          },
        },
        select: { promiseId: true },
      })
      .then(({ promiseId }) => ({ id: promiseId }))
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

  async getAttendees(id: number, attendeeIds?: number[]) {
    return this.prisma.promiseUser.findMany({
      where: {
        promiseId: id,
        ...(attendeeIds?.length && { userId: { in: attendeeIds } }),
      },
      include: { startLocation: true },
    });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.HostDoNotCancel}
   */
  async leave(id: number, userId: number): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const promise = await tx.promise.findUnique({
        where: this.#makeFilter({ id, status: PromiseStatus.AVAILABLE }),
        select: { id: true, hostId: true, promisedAt: true, completedAt: true },
      });

      if (!promise) {
        throw PromiseServiceError.NotFoundPromise;
      }

      if (promise.hostId === userId) {
        throw PromiseServiceError.HostDoNotCancel;
      }

      await tx.promiseUser.delete({
        where: { identifier: { userId, promiseId: promise.id } },
      });
    });
  }

  async getThemes(): Promise<ThemeModel[]> {
    return this.prisma.theme.findMany();
  }

  #makeFilter(condition?: PromiseFilter): Prisma.PromiseWhereUniqueInput;
  #makeFilter(condition?: PromiseFilter): Prisma.PromiseWhereInput;
  #makeFilter(condition?: PromiseFilter) {
    if (!condition) return {};
    const result = {} as Prisma.PromiseWhereInput | Prisma.PromiseWhereUniqueInput;
    const now = new Date();

    if (condition.id) {
      result.id = condition.id;
    }

    if ('status' in condition) {
      switch (condition.status) {
        case PromiseStatus.AVAILABLE:
          result.promisedAt = { gte: now };
          result.completedAt = null;
          break;
        case PromiseStatus.UNAVAILABLE:
          result.OR = [{ promisedAt: { lt: now } }, { completedAt: { not: null } }];
          break;
      }
    }

    if ('role' in condition) {
      switch (condition.role) {
        case PromiseUserRole.ALL:
          result.users = { some: { userId: condition.userId } };
          break;
        case PromiseUserRole.HOST:
          result.hostId = condition.userId;
          break;
        case PromiseUserRole.ATTENDEE:
          result.hostId = { not: condition.userId };
          result.users = { some: { userId: condition.userId } };
          break;
      }
    }

    return result;
  }
}
