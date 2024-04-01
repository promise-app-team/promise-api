import { Prisma } from '@prisma/client';
import { addHours } from 'date-fns';

import {
  DestinationType,
  LocationModel,
  LocationShareType,
  PromiseModel,
  PromiseUserModel,
  Provider,
  ThemeModel,
  UserModel,
} from '@/prisma/prisma.entity';

interface ModelBuilder<T extends Record<string, any>> {
  (partial?: Partial<T>): T;
  <U>(transform?: (result: T) => U): U;
  <U>(transform?: (result: T) => Promise<U>): Promise<U>;
  <U>(partial?: Partial<T>, transform?: (result: T) => U): U;
  <U>(partial?: Partial<T>, transform?: (result: T) => Promise<U>): Promise<U>;
}

function createModelBuilder<T extends Record<string, any>>(
  initialId: number,
  defaultValue: (id: number) => T
): ModelBuilder<T> {
  const builder: any = (partial: any, transform: any) => {
    if (typeof partial === 'function') {
      return builder(undefined, partial);
    }

    const result = {
      ...defaultValue(partial?.id ?? ++initialId),
      ...partial,
    } as T;

    return transform?.(result) ?? result;
  };

  return builder as ModelBuilder<T>;
}

export function createUserBuilder(initialId: number) {
  return createModelBuilder<UserModel>(initialId, (id) => ({
    id,
    username: 'username',
    profileUrl: 'http://profile.url',
    provider: randomEnum(Provider),
    providerId: `${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedAt: new Date(),
  }));
}

export function createLocationBuilder(initialId: number) {
  return createModelBuilder<LocationModel>(initialId, (id) => ({
    id,
    city: 'city',
    district: 'district',
    address: 'address',
    latitude: new Prisma.Decimal(37.123456),
    longitude: new Prisma.Decimal(127.123456),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export function createThemeBuilder(initialId: number) {
  return createModelBuilder<ThemeModel>(initialId, (id) => ({
    id,
    name: 'theme',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export function createPromiseBuilder(initialId: number) {
  return createModelBuilder<Omit<PromiseModel, 'pid'>>(initialId, (id) => ({
    id,
    title: 'promise',
    createdAt: new Date(),
    updatedAt: new Date(),
    hostId: 0,
    destinationType: randomEnum(DestinationType),
    destinationId: 0,
    locationShareStartType: randomEnum(LocationShareType),
    locationShareStartValue: 0,
    locationShareEndType: randomEnum(LocationShareType),
    locationShareEndValue: 0,
    promisedAt: addHours(new Date(), 1),
    completedAt: null,
  }));
}

export function createPromiseUserBuilder(initialId: number) {
  return createModelBuilder<PromiseUserModel>(initialId, () => ({
    userId: 0,
    promiseId: 0,
    startLocationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function randomEnum<E extends Record<string, any>>(enumType: E): E[keyof E] {
  const values = Object.values(enumType);
  return values[Math.floor(Math.random() * values.length)];
}
