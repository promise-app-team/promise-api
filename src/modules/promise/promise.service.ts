import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as R from 'remeda';

import { InputCreatePromiseDTO, InputLocationDTO, InputUpdatePromiseDTO } from './promise.dto';
import { PromiseStatus, PromiseUserRole } from './promise.enum';
import { isEqualLocation, makePromiseFilter, makeUniquePromiseFilter } from './promise.utils';

import { PrismaService, LocationModel, PrismaClientError } from '@/prisma';

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
  attendees: {
    select: {
      attendee: true,
      startLocationId: true,
      isMidpointCalculated: true,
      attendedAt: true,
      leavedAt: true,
    },
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
      where: makePromiseFilter(condition),
      select: { id: true },
    });
    return !!exists;
  }

  async findAll(condition: Pick<FilterOptions, 'role' | 'status' | 'userId'>): Promise<PromiseResult[]> {
    return this.prisma.promise.findMany({
      where: makePromiseFilter(condition),
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
      where: makePromiseFilter(condition),
      include: promiseInclude,
      orderBy: { id: 'asc' },
    });

    if (!user) {
      throw PromiseServiceError.NotFoundPromise;
    }

    return user;
  }

  async create(attendeeId: number, input: InputCreatePromiseDTO): Promise<PromiseResult> {
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
            id: attendeeId,
          },
        },
        attendees: {
          create: {
            attendeeId,
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
  async update(
    id: number,
    hostId: number,
    refIds: number[],
    input: Omit<InputUpdatePromiseDTO, 'middleLocationRef'>
  ): Promise<PromiseResult> {
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

    if (refIds.length) {
      await Promise.all([
        this.prisma.promiseUser.updateMany({
          where: { promiseId: id },
          data: { isMidpointCalculated: false },
        }),
        this.prisma.promiseUser.updateMany({
          where: { attendeeId: { in: refIds }, promiseId: id },
          data: { isMidpointCalculated: true },
        }),
      ]);
    }

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
  async getStartLocation(id: number, attendeeId: number): Promise<LocationModel> {
    const promise = await this.findOne({ id, status: PromiseStatus.AVAILABLE });

    const promiseUser = await this.prisma.promiseUser.findUnique({
      where: { identifier: { attendeeId, promiseId: promise.id } },
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
        where: makeUniquePromiseFilter({ id, status: PromiseStatus.AVAILABLE }),
      });

      const { startLocation } = await this.prisma.promiseUser.findUniqueOrThrow({
        where: { identifier: { attendeeId, promiseId: promise.id } },
        select: { startLocation: true },
      });

      const promiseUser = await this.prisma.promiseUser.update({
        where: { identifier: { attendeeId, promiseId: promise.id } },
        data: {
          promise: {
            update: {
              isLatestDestination: promise.isLatestDestination && isEqualLocation(startLocation, input),
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
  async deleteStartLocation(id: number, attendeeId: number): Promise<{ id: number }> {
    try {
      const promiseUser = await this.prisma.promiseUser.findUniqueOrThrow({
        where: { identifier: { attendeeId, promiseId: id } },
        select: { startLocationId: true },
      });

      if (!promiseUser.startLocationId) {
        throw PromiseServiceError.NotFoundStartLocation;
      }

      await this.prisma.location.deleteMany({
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
          attendee: {
            connect: {
              id: userId,
            },
          },
          promise: {
            connect: makeUniquePromiseFilter({ id, status: PromiseStatus.AVAILABLE }),
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
        promise: makeUniquePromiseFilter({ id, status: PromiseStatus.AVAILABLE }),
        ...(attendeeIds?.length && { attendeeId: { in: attendeeIds } }),
      },
      include: { startLocation: true },
    });
  }

  /**
   * @throws {PromiseServiceError.NotFoundPromise}
   * @throws {PromiseServiceError.HostCannotLeave}
   */
  async leave(id: number, attendeeId: number): Promise<{ id: number }> {
    try {
      const promise = await this.prisma.promise.findUniqueOrThrow({
        where: makeUniquePromiseFilter({ id, userId: attendeeId, status: PromiseStatus.AVAILABLE }),
        select: { id: true, hostId: true },
      });

      if (promise.hostId === attendeeId) {
        throw PromiseServiceError.HostCannotLeave;
      }

      await this.prisma.promiseUser.updateMany({
        data: { leavedAt: new Date() },
        where: { attendeeId, promiseId: promise.id },
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
          ...makeUniquePromiseFilter({ id, status: PromiseStatus.AVAILABLE }),
          ...makeUniquePromiseFilter({ userId: hostId, role: PromiseUserRole.HOST }),
          ...makeUniquePromiseFilter({ userId: attendeeId, role: PromiseUserRole.ATTENDEE }),
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
        where: makeUniquePromiseFilter({
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
}
