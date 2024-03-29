import { PickType } from '@nestjs/mapped-types';
import {
  Prisma,
  Provider as ProviderEnum,
  DestinationType as DestinationTypeEnum,
  LocationShareType as LocationShareTypeEnum,
} from '@prisma/client';

/**
 * @see {@link ProviderEnum}
 */
export enum Provider {
  KAKAO = 'KAKAO',
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

/**
 * @see {@link DestinationTypeEnum}
 */
export enum DestinationType {
  STATIC = 'STATIC',
  DYNAMIC = 'DYNAMIC',
}

/**
 * @see {@link LocationShareTypeEnum}
 */
export enum LocationShareType {
  DISTANCE = 'DISTANCE',
  TIME = 'TIME',
}

const promiseUserInclude: Prisma.PromiseUserInclude = {
  user: true,
  promise: true,
  startLocation: true,
};

const promiseThemeInclude: Prisma.PromiseThemeInclude = {
  theme: true,
  promise: true,
};

const userInclude: Prisma.UserInclude = {
  myPromises: true,
  promises: {
    include: promiseUserInclude,
  },
};

const themeInclude: Prisma.ThemeInclude = {
  promises: {
    include: promiseThemeInclude,
  },
};

const promiseInclude: Prisma.PromiseInclude = {
  host: true,
  users: {
    include: promiseUserInclude,
  },
  themes: {
    include: promiseThemeInclude,
  },
  destination: true,
};

const locationInclude: Prisma.LocationInclude = {
  promises: true,
  promiseUsers: true,
};

type UserPayload = Prisma.UserGetPayload<{ include: typeof userInclude }>;
type ThemePayload = Prisma.ThemeGetPayload<{ include: typeof themeInclude }>;
type PromisePayload = Prisma.PromiseGetPayload<{ include: typeof promiseInclude }>;
type LocationPayload = Prisma.LocationGetPayload<{ include: typeof locationInclude }>;
type PromiseUserPayload = Prisma.PromiseUserGetPayload<{ include: typeof promiseUserInclude }>;
type PromiseThemePayload = Prisma.PromiseThemeGetPayload<{ include: typeof promiseThemeInclude }>;

export class UserEntity implements UserPayload {
  id!: number;

  username!: string | null;
  profileUrl!: string | null;

  provider!: Provider;
  providerId!: string;

  lastSignedAt!: Date;
  deletedAt!: Date | null;
  leaveReason!: string | null;

  createdAt!: Date;
  updatedAt!: Date;

  myPromises!: PromiseEntity[];
  promises!: PromiseUserEntity[];

  _count!: {
    myPromises: number;
    promises: number;
  };
}

export class UserModel extends PickType(UserEntity, [
  'id',
  'username',
  'profileUrl',
  'provider',
  'providerId',
  'lastSignedAt',
  'createdAt',
  'updatedAt',
]) {}

export class ThemeEntity implements ThemePayload {
  id!: number;
  name!: string;
  promises!: PromiseThemeEntity[];

  _count: { promises: number };
}

export class ThemeModel extends PickType(ThemeEntity, ['id', 'name']) {}

export class PromiseEntity implements PromisePayload {
  id!: number;
  pid!: string; // only for type

  title!: string;

  hostId!: number;
  host!: UserEntity;

  destinationType!: DestinationType;
  destinationId!: number | null;
  destination!: LocationEntity | null;

  locationShareStartType!: LocationShareType;
  locationShareStartValue!: number;
  locationShareEndType!: LocationShareType;
  locationShareEndValue!: number;

  promisedAt!: Date;
  completedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;

  users!: PromiseUserEntity[];
  themes!: PromiseThemeEntity[];

  _count: {
    host: number;
    destination: number;
    users: number;
    themes: number;
  };
}

export class PromiseModel extends PickType(PromiseEntity, [
  'id',
  'pid', // only for type
  'title',
  'hostId',
  'destinationType',
  'destinationId',
  'locationShareStartType',
  'locationShareStartValue',
  'locationShareEndType',
  'locationShareEndValue',
  'promisedAt',
  'completedAt',
  'createdAt',
  'updatedAt',
]) {}

export class LocationEntity implements LocationPayload {
  id!: number;
  city: string | null;
  district: string | null;
  address: string | null;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;

  createdAt!: Date;
  updatedAt!: Date;

  promises!: PromiseEntity[];
  promiseUsers!: PromiseUserEntity[];

  _count!: {
    promises: number;
    promiseUsers: number;
  };
}

export class LocationModel extends PickType(LocationEntity, [
  'id',
  'city',
  'district',
  'address',
  'latitude',
  'longitude',
  'createdAt',
  'updatedAt',
]) {}

export class PromiseUserEntity implements PromiseUserPayload {
  userId!: number;
  user!: UserEntity;

  promiseId!: number;
  promise!: PromiseEntity;

  startLocationId: number | null;
  startLocation!: LocationEntity | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export class PromiseUserModel extends PickType(PromiseUserEntity, [
  'userId',
  'promiseId',
  'startLocationId',
  'createdAt',
  'updatedAt',
]) {}

export class PromiseThemeEntity implements PromiseThemePayload {
  themeId!: number;
  theme!: ThemeEntity;

  promiseId!: number;
  promise!: PromiseEntity;

  createdAt!: Date;
  updatedAt!: Date;
}

export class PromiseThemeModel extends PickType(PromiseThemeEntity, [
  'themeId',
  'promiseId',
  'createdAt',
  'updatedAt',
]) {}
