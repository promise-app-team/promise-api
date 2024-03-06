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
  providerId!: string | null;

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

export class ThemeEntity implements ThemePayload {
  id!: number;
  name!: string;
  promises!: PromiseThemeEntity[];

  _count: { promises: number };
}

export class PromiseEntity implements PromisePayload {
  id!: number;
  pid!: string;

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

export class PromiseThemeEntity implements PromiseThemePayload {
  themeId!: number;
  theme!: ThemeEntity;

  promiseId!: number;
  promise!: PromiseEntity;

  createdAt!: Date;
  updatedAt!: Date;
}
