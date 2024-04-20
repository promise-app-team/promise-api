import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as R from 'remeda';

import { InputCreatePromiseDTO, InputLocationDTO, InputUpdatePromiseDTO } from './promise.dto';
import { PromiseStatus, PromiseUserRole } from './promise.enum';

import { PrismaService, LocationModel, ThemeModel, PrismaClientError } from '@/prisma';
import { createQueryBuilder } from '@/prisma/utils';

export enum PromiseServiceError {
  NotFoundPromise = '약속을 찾을 수 없습니다.',
  NotFoundStartLocation = '등록한 출발지가 없습니다.',
  AlreadyAttended = '이미 참여한 약속입니다.',
  OnlyHostUpdatable = '약속장만 약속을 수정할 수 있습니다.',
  HostCannotLeave = '약속장은 약속을 취소할 수 없습니다.',
}

type FilterOptions = {
  id?: number;
  status?: PromiseStatus;
  role?: PromiseUserRole;
  userId?: number;
};

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

  async exists(condition: FilterOptions): Promise<boolean> {
    const exists = await this.prisma.promise.findFirst({
      where: this.#makeFilter(condition),
      select: { id: true },
    });
    return !!exists;
  }

  async findAll(condition: Pick<FilterOptions, 'role' | 'status' | 'userId'>): Promise<PromiseResult[]> {
    return this.prisma.promise.findMany({
      where: this.#makeFilter(condition),
      include: promiseInclude,
      orderBy: { id: 'asc' },
    });
  }

  /**
   *
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async findOne(condition: FilterOptions): Promise<PromiseResult> {
    const user = await this.prisma.promise.findFirst({
      where: this.#makeFilter(condition),
      include: promiseInclude,
      orderBy: { id: 'asc' },
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
  async update(id: number, hostId: number, input: InputUpdatePromiseDTO): Promise<PromiseResult> {
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
        isLatestDestination: !!input.destination,
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
    try {
      const promise = await this.prisma.promise.findUniqueOrThrow({
        where: this.#makeUniqueFilter({ id, status: PromiseStatus.AVAILABLE }),
      });

      const { startLocation } = await this.prisma.promiseUser.findUniqueOrThrow({
        where: { identifier: { userId: attendeeId, promiseId: promise.id } },
        select: { startLocation: true },
      });

      const promiseUser = await this.prisma.promiseUser.update({
        where: { identifier: { userId: attendeeId, promiseId: promise.id } },
        data: {
          promise: {
            update: {
              isLatestDestination: promise.isLatestDestination && this.#isEqualLocation(startLocation, input),
            },
          },
          startLocation: {
            upsert: {
              create: input,
              update: input,
            },
          },
        },
        select: { startLocation: true },
      });

      return promiseUser.startLocation!;
    } catch (error) {
      switch (PrismaClientError.from(error)?.code) {
        case 'P2025':
          throw PromiseServiceError.NotFoundPromise;
        default:
          throw error;
      }
    }
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.NotFoundStartLocation}
   */
  async deleteStartLocation(id: number, userId: number): Promise<{ id: number }> {
    try {
      const promiseUser = await this.prisma.promiseUser.findFirstOrThrow({
        where: { userId, promiseId: id },
        select: { startLocationId: true },
      });

      if (!promiseUser.startLocationId) {
        throw PromiseServiceError.NotFoundStartLocation;
      }

      await this.prisma.location.delete({
        where: { id: promiseUser.startLocationId },
      });

      return { id: promiseUser.startLocationId };
    } catch (error) {
      switch (PrismaClientError.from(error)?.code) {
        case 'P2025':
          throw PromiseServiceError.NotFoundPromise;
        default:
          throw error;
      }
    }
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
            connect: this.#makeUniqueFilter({ id, status: PromiseStatus.AVAILABLE }),
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
  async leave(id: number, userId: number): Promise<{ id: number }> {
    try {
      const promise = await this.prisma.promise.findUniqueOrThrow({
        where: this.#makeUniqueFilter({ id, status: PromiseStatus.AVAILABLE }),
        select: { id: true, hostId: true },
      });

      if (promise.hostId === userId) {
        throw PromiseServiceError.HostCannotLeave;
      }

      await this.prisma.promiseUser.delete({
        where: { identifier: { userId, promiseId: promise.id } },
      });

      return { id: promise.id };
    } catch (error) {
      switch (PrismaClientError.from(error)?.code) {
        case 'P2025':
          throw PromiseServiceError.NotFoundPromise;
        default:
          throw error;
      }
    }
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   */
  async delegate(id: number, hostId: number, attendeeId: number): Promise<{ id: number }> {
    try {
      return await this.prisma.promise.update({
        where: {
          ...this.#makeUniqueFilter({ id, status: PromiseStatus.AVAILABLE }),
          ...this.#makeUniqueFilter({ userId: hostId, role: PromiseUserRole.HOST }),
          ...this.#makeUniqueFilter({ userId: attendeeId, role: PromiseUserRole.ATTENDEE }),
        },
        data: { hostId: attendeeId },
        select: { id: true },
      });
    } catch (error) {
      switch (PrismaClientError.from(error)?.code) {
        case 'P2025':
          throw PromiseServiceError.NotFoundPromise;
        default:
          throw error;
      }
    }
  }

  async complete(id: number, hostId: number): Promise<{ id: number }> {
    try {
      return await this.prisma.promise.update({
        where: this.#makeUniqueFilter({
          id,
          userId: hostId,
          role: PromiseUserRole.HOST,
          status: PromiseStatus.AVAILABLE,
        }),
        data: { completedAt: new Date() },
        select: { id: true },
      });
    } catch (error) {
      switch (PrismaClientError.from(error)?.code) {
        case 'P2025':
          throw PromiseServiceError.NotFoundPromise;
        default:
          throw error;
      }
    }
  }

  async getThemes(): Promise<ThemeModel[]> {
    return this.prisma.theme.findMany();
  }

  #makeUniqueFilter<F extends FilterOptions>(filter: F): Prisma.PromiseWhereUniqueInput {
    return R.mergeAll(this.#makeFilter(filter).AND) as Prisma.PromiseWhereUniqueInput;
  }

  #makeFilter(filter: FilterOptions) {
    const qb = createQueryBuilder<Prisma.PromiseWhereInput>();

    if (typeof filter.id === 'number') {
      qb.andWhere({ id: filter.id });
    } else if (typeof filter.id === 'string') {
      throw new Error('Invalid ID');
    }

    if (typeof filter.userId === 'number') {
      qb.andWhere({ OR: [{ hostId: filter.userId }, { users: { some: { userId: filter.userId } } }] });

      switch (filter.role) {
        case PromiseUserRole.HOST:
          qb.andWhere({ hostId: filter.userId });
          break;
        case PromiseUserRole.ATTENDEE:
          qb.andWhere({
            NOT: { hostId: filter.userId },
            users: { some: { userId: filter.userId } },
          });
          break;
        case PromiseUserRole.ALL:
          qb.andWhere({ OR: [{ hostId: filter.userId }, { users: { some: { userId: filter.userId } } }] });
          break;
      }
    }

    switch (filter.status) {
      case PromiseStatus.AVAILABLE:
        qb.andWhere({ promisedAt: { gte: new Date() }, completedAt: null });
        break;
      case PromiseStatus.UNAVAILABLE:
        qb.andWhere({ OR: [{ promisedAt: { lt: new Date() } }, { completedAt: { not: null } }] });
        break;
      case PromiseStatus.ALL:
        break;
    }

    return qb.build();
  }

  #isEqualLocation<Location extends InputLocationDTO>(loc1: Location | null, loc2: Location | null): boolean {
    if (!loc1 || !loc2) return false;

    const [l1, l2] = R.map(
      [loc1, loc2],
      R.piped(
        (loc) => R.set(loc, 'latitude', new Prisma.Decimal(loc.latitude).toFixed(6)),
        (loc) => R.set(loc, 'longitude', new Prisma.Decimal(loc.longitude).toFixed(6))
      )
    );

    return (
      l1.city === l2.city &&
      l1.district === l2.district &&
      l1.address === l2.address &&
      l1.latitude === l2.latitude &&
      l1.longitude === l2.longitude
    );
  }
}
