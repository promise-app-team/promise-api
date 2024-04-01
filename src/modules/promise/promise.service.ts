import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as R from 'remeda';

import { InputCreatePromiseDTO, InputLocationDTO, PromiseStatus, PromiseUserRole } from './promise.dto';

import { PrismaClientError } from '@/prisma/error-handler';
import { LocationModel, ThemeModel } from '@/prisma/prisma.entity';
import { PrismaService } from '@/prisma/prisma.service';

export enum PromiseServiceError {
  NotFoundPromise = '약속을 찾을 수 없습니다.',
  NotFoundStartLocation = '등록한 출발지가 없습니다.',
  AlreadyAttended = '이미 참여한 약속입니다.',
  OnlyHostUpdatable = '약속장만 약속을 수정할 수 있습니다.',
  HostCannotLeave = '약속장은 약속을 취소할 수 없습니다.',
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

  async exists(condition?: PromiseFilter): Promise<boolean> {
    const exists = await this.prisma.promise.findUnique({
      where: this.#makeFilter(condition),
      select: { id: true },
    });
    return !!exists;
  }

  async findAll(condition?: PromiseFilter): Promise<PromiseResult[]> {
    return this.prisma.promise.findMany({
      where: this.#makeFilter(condition),
      include: promiseInclude,
    });
  }

  /**
   *
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async findOne(condition?: PromiseFilter): Promise<PromiseResult> {
    const user = await this.prisma.promise.findUnique({
      where: this.#makeFilter(condition),
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
        ...R.pick(input, [
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
      where: { id },
      select: { id: true, hostId: true, destinationId: true },
    });

    if (!promise) {
      throw PromiseServiceError.NotFoundPromise;
    }

    if (promise.hostId !== hostId) {
      throw PromiseServiceError.OnlyHostUpdatable;
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
        ...R.pick(input, [
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
              in: R.pipe(
                themes,
                R.map((theme) => theme.themeId),
                R.filter(R.isNot(R.isIncludedIn(input.themeIds)))
              ),
            },
          },
          createMany: {
            data: R.pipe(
              input.themeIds,
              R.filter(R.isNot(R.isIncludedIn(themes.map((theme) => theme.themeId)))),
              R.map((themeId) => ({ themeId }))
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
    const promise = await this.findOne({ id, status: PromiseStatus.AVAILABLE });

    const promiseUser = await this.prisma.promiseUser.findFirst({
      where: { userId, promiseId: promise.id },
      include: { startLocation: true },
    });

    if (!promiseUser) {
      throw PromiseServiceError.NotFoundPromise;
    }

    if (!promiseUser.startLocation) {
      throw PromiseServiceError.NotFoundStartLocation;
    }

    return promiseUser.startLocation;
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async updateStartLocation(id: number, attendeeId: number, input: InputLocationDTO): Promise<LocationModel> {
    const promise = await this.findOne({ id, role: PromiseUserRole.HOST, status: PromiseStatus.AVAILABLE });

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
    const promiseUser = await this.prisma.promiseUser.findFirst({
      where: { userId, promiseId: id },
      select: { startLocationId: true },
    });

    if (!promiseUser) {
      throw PromiseServiceError.NotFoundPromise;
    }

    await this.prisma.location.delete({
      where: { id: promiseUser?.startLocationId ?? 0 },
    });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.AlreadyAttended}
   */
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
            throw PromiseServiceError.AlreadyAttended;
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
   * @throws {PromiseServiceError.HostCannotLeave}
   */
  async leave(id: number, userId: number): Promise<void> {
    const promise = await this.prisma.promise.findUnique({
      where: this.#makeFilter({ id, status: PromiseStatus.AVAILABLE }),
      select: { id: true, hostId: true, promisedAt: true, completedAt: true },
    });

    if (!promise) {
      throw PromiseServiceError.NotFoundPromise;
    }

    if (promise.hostId === userId) {
      throw PromiseServiceError.HostCannotLeave;
    }

    await this.prisma.promiseUser
      .delete({
        where: { identifier: { userId, promiseId: promise.id } },
      })
      .catch((error) => {
        switch (PrismaClientError.from(error)?.code) {
          case 'P2025':
            throw PromiseServiceError.NotFoundPromise;
          default:
            throw error;
        }
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

    if (typeof condition.id === 'number') {
      result.id = condition.id;
    }

    if ('status' in condition) {
      switch (condition.status) {
        case PromiseStatus.AVAILABLE:
          result.promisedAt = { gte: now };
          result.completedAt = null;
          break;
        case PromiseStatus.UNAVAILABLE:
          (result.OR ??= []).push({ promisedAt: { lt: now } }, { completedAt: { not: null } });
          break;
      }
    }

    if ('role' in condition) {
      switch (condition.role) {
        case PromiseUserRole.ALL:
          (result.OR ??= []).push({ hostId: condition.userId }, { users: { some: { userId: condition.userId } } });
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
