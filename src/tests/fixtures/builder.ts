/* eslint-disable @typescript-eslint/no-unused-vars */
import { Prisma, PrismaClient } from '@prisma/client';
import { addHours } from 'date-fns';

import {
  DestinationType,
  LocationModel,
  LocationShareType,
  PromiseModel,
  PromiseThemeModel,
  PromiseUserModel,
  Provider,
  ThemeModel,
  UserModel,
} from '@/prisma/prisma.entity';

export interface Result<Input, Output> {
  input: Input;
  output: Output;
}

type Param<T extends Record<string, any>, R extends keyof T = never> = [R] extends [never]
  ? Partial<T>
  : Partial<T> & Required<Pick<T, R>>;

interface RequiredModuleBuilder<T extends Record<string, any>, R extends keyof T, P = Param<T, R>> {
  (partial: P): T;
  <U>(partial: P, transform?: (result: T) => Promise<U>): Promise<Result<T, U>>;
  <U>(partial: P, transform?: (result: T) => U): Result<T, U>;
}

interface OptionalModuleBuilder<T extends Record<string, any>, P = Param<T>> {
  (partial?: P): T;
  <U>(transform?: (result: T) => Promise<U>): Promise<Result<T, U>>;
  <U>(transform?: (result: T) => U): Result<T, U>;
  <U>(partial?: P, transform?: (result: T) => Promise<U>): Promise<Result<T, U>>;
  <U>(partial?: P, transform?: (result: T) => U): Result<T, U>;
}

export type ModelBuilder<T extends Record<string, any>, R extends keyof T = never> = [R] extends [never]
  ? OptionalModuleBuilder<T>
  : RequiredModuleBuilder<T, R>;

function createModelBuilder<T extends Record<string, any>, R extends keyof T = never>(
  initialId: number,
  defaultValue: (id: number) => T
): ModelBuilder<T, R> {
  const builder: any = (partial: any, transform: any) => {
    if (typeof partial === 'function') {
      return builder(undefined, partial);
    }

    const result = {
      ...defaultValue(partial?.id ?? ++initialId),
      ...partial,
    } as T;

    if (typeof transform === 'undefined') {
      return result;
    }

    const input = { ...result };
    const output = transform(result);

    if (isPromiseLike(output)) {
      return output.then((output) => ({ input, output }));
    }

    return { input, output };
  };

  return builder as ModelBuilder<T, R>;
}

function isPromiseLike(value: any): value is Promise<any> {
  return value && typeof value.then === 'function';
}

export function createUserBuilder(initialId: number) {
  return createModelBuilder<UserModel>(initialId, (id) => ({
    id,
    username: `username ${id}`,
    profileUrl: 'http://profile.url',
    provider: Provider.KAKAO,
    providerId: `providerId ${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedAt: new Date(),
  }));
}

export function createLocationBuilder(initialId: number) {
  return createModelBuilder<LocationModel>(initialId, (id) => ({
    id,
    city: `city ${id}`,
    district: `district ${id}`,
    address: `address ${id}`,
    latitude: new Prisma.Decimal(37.123456),
    longitude: new Prisma.Decimal(127.123456),
    createdAt: iso8601Date(),
    updatedAt: iso8601Date(),
  }));
}

export function createThemeBuilder(initialId: number) {
  return createModelBuilder<ThemeModel>(initialId, (id) => ({
    id,
    name: randomString(10, (str) => str.toUpperCase()),
  }));
}

export function createPromiseBuilder(initialId: number) {
  return createModelBuilder<Omit<PromiseModel, 'pid'>, 'hostId'>(initialId, (id) => ({
    id,
    title: `title ${id}`,
    hostId: 0,
    destinationType: DestinationType.STATIC,
    destinationId: null,
    locationShareStartType: LocationShareType.TIME,
    locationShareStartValue: id,
    locationShareEndType: LocationShareType.TIME,
    locationShareEndValue: id,
    promisedAt: addHours(new Date(), 1),
    completedAt: null,
    createdAt: iso8601Date(),
    updatedAt: iso8601Date(),
  }));
}

export function createPromiseUserBuilder(initialId: number) {
  return createModelBuilder<PromiseUserModel, 'userId' | 'promiseId'>(initialId, () => ({
    userId: 0,
    promiseId: 0,
    startLocationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export function createPromiseThemeBuilder(initialId: number) {
  return createModelBuilder<PromiseThemeModel, 'promiseId' | 'themeId'>(initialId, (id: number) => ({
    promiseId: 0,
    themeId: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function randomString(length: number, fn?: (str: string) => string) {
  const str = Math.random()
    .toString(36)
    .substring(2, 2 + length);
  return fn?.(str) ?? str;
}

function iso8601Date(date = new Date()) {
  date.setMilliseconds(0);
  return date;
}
