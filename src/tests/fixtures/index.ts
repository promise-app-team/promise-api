import {
  PrismaClient,
  User as PrismaUser,
  Location as PrismaLocation,
  Theme as PrismaTheme,
  Promise as PrismaPromise,
} from '@prisma/client';
import { addDays, formatISO, subDays } from 'date-fns';
import * as R from 'remeda';

import { deleteMany } from '../prisma';

import { Result, isResult } from './builder';
import { createLocationBuilder } from './locations';
import { createPromiseThemeBuilder } from './promise-themes';
import { createPromiseUserBuilder } from './promise-users';
import { createPromiseBuilder } from './promises';
import { createThemeBuilder } from './themes';
import { createUserBuilder } from './users';

import { LocationModel, PromiseModel, ThemeModel, UserModel } from '@/prisma/prisma.entity';

interface TestFixtureOptions {
  logging?: boolean;
}

type PromiseCompleteOptions = {
  host?: Result<UserModel, PrismaUser>;
  destination?: boolean | Result<LocationModel, PrismaLocation>;
  theme?: boolean | Result<ThemeModel, PrismaTheme>;
  themes?: number | Result<ThemeModel, PrismaTheme>[];
  attendee?: boolean | Result<UserModel, PrismaUser>;
  attendees?: number | Result<UserModel, PrismaUser>[];
  startLocation?: boolean | Result<LocationModel, PrismaLocation>;
  startLocations?: number | Result<LocationModel, PrismaLocation>[];
  partial?: Partial<Omit<PromiseModel, 'pid'>>;
};

type Falsy = false | 0 | '' | null | undefined;

type NonNullableIf<T, C> = C extends Falsy ? null : NonNullable<T>;

interface PromiseComplete<Options extends PromiseCompleteOptions> {
  host: Result<UserModel, PrismaUser>;
  destination: NonNullableIf<Result<LocationModel, PrismaLocation>, Options['destination']>;
  theme: NonNullableIf<Result<ThemeModel, PrismaTheme>, Options['theme']>;
  themes: Result<ThemeModel, PrismaTheme>[];
  startLocation: NonNullableIf<Result<LocationModel, PrismaLocation>, Options['startLocation']>;
  startLocations: Result<LocationModel, PrismaLocation>[];
  attendee: NonNullableIf<Result<UserModel, PrismaUser>, Options['attendee']>;
  attendees: Result<UserModel, PrismaUser>[];
  promise: Result<Omit<PromiseModel, 'pid'>, PrismaPromise>;
}

export function createTestFixture(
  prisma: PrismaClient,
  range: { from: number; to: number },
  options: TestFixtureOptions = {}
) {
  const createInputUser = createUserBuilder(range.from);
  const createInputTheme = createThemeBuilder(range.from);
  const createInputPromise = createPromiseBuilder(range.from);
  const createInputLocation = createLocationBuilder(range.from);
  const createInputPromiseUser = createPromiseUserBuilder(range.from);
  const createInputPromiseThemes = createPromiseThemeBuilder(range.from);

  const yesterday = formatISO(subDays(new Date(), 1));
  const tomorrow = formatISO(addDays(new Date(), 1));

  async function writeUser(partial?: Partial<UserModel>) {
    R.isNumber(partial?.id) ? log(`Creating a user with id: ${partial.id}`) : log('Creating a user');
    return createInputUser(partial, (user) => prisma.user.create({ data: user }));
  }

  async function writeUsers(num: number = 3) {
    const n = Math.max(0, num);
    log(`Creating ${n} users`);
    return Promise.all(R.times(n, () => createInputUser((user) => prisma.user.create({ data: user }))));
  }

  async function writeLocation(partial?: Partial<LocationModel>) {
    R.isNumber(partial?.id) ? log(`Creating a location with id: ${partial.id}`) : log('Creating a location');
    return createInputLocation(partial, (location) => prisma.location.create({ data: location }));
  }

  async function writeLocations(num: number = 3) {
    const n = Math.max(0, num);
    log(`Creating ${n} locations`);
    return Promise.all(R.times(n, () => createInputLocation((location) => prisma.location.create({ data: location }))));
  }

  async function writeTheme(partial?: Partial<ThemeModel>) {
    R.isNumber(partial?.id) ? log(`Creating a theme with id: ${partial.id}`) : log('Creating a theme');
    return createInputTheme(partial, (theme) => prisma.theme.create({ data: theme }));
  }

  async function writeThemes(num: number = 3) {
    const n = Math.max(0, num);
    log(`Creating ${n} themes`);
    return Promise.all(R.times(n, () => createInputTheme((theme) => prisma.theme.create({ data: theme }))));
  }

  async function writePromise<Options extends PromiseCompleteOptions>(
    options?: Options
  ): Promise<PromiseComplete<Options>> {
    options ??= {} as Options;

    const result = {} as PromiseComplete<Options>;

    result.host = await R.conditional(
      options.host,
      [(host) => isResult(host), (host) => host!],
      R.conditional.defaultCase(() => writeUser())
    );

    result.destination = await R.conditional(
      options.destination,
      [(dest) => isResult(dest), (dest) => dest as any],
      [R.isTruthy, () => writeLocation()],
      R.conditional.defaultCase(() => null)
    );

    result.attendee = await R.conditional(
      options.attendee,
      [(attendee) => isResult(attendee), (attendee) => attendee as any],
      [R.isTruthy, () => writeUser()],
      R.conditional.defaultCase(() => null)
    );

    result.attendees = await R.conditional(
      options.attendees,
      [R.isArray, (attendees) => attendees as any[]],
      [R.isNumber, (num) => writeUsers(num)],
      R.conditional.defaultCase(() => [])
    );

    result.startLocation = await R.conditional(
      options.startLocation,
      [(start) => isResult(start), (start) => start as any],
      [R.isTruthy, () => writeLocation()],
      R.conditional.defaultCase(() => null)
    );

    result.startLocations = await R.conditional(
      options.startLocations,
      [R.isArray, (starts) => starts as any[]],
      [R.isNumber, (num) => writeLocations(num)],
      R.conditional.defaultCase(() => [])
    );

    result.theme = await R.conditional(
      options.theme,
      [(theme) => isResult(theme), (theme) => theme as any],
      [R.isTruthy, () => writeTheme()],
      R.conditional.defaultCase(() => null)
    );

    result.themes = await R.conditional(
      options.themes,
      [R.isArray, (themes) => themes as any[]],
      [R.isNumber, (num) => writeThemes(num)],
      R.conditional.defaultCase(() => [])
    );

    const { host, destination, startLocation, attendee, attendees, startLocations, theme, themes } = result;
    startLocations.length = attendees.length;

    const attendeeIds = R.pipe(
      [host, attendee, ...attendees],
      R.zip.strict([null, startLocation, ...startLocations]),
      R.filter(([attendee]) => R.isTruthy(attendee)),
      R.map(([attendee, startLocation]) => ({
        userId: attendee!.output.id,
        startLocationId: startLocation?.output.id ?? null,
      }))
    );

    const themeIds = R.pipe(
      [theme, ...themes],
      R.filter(R.isTruthy),
      R.map((theme) => theme.output.id)
    );

    result.promise = await createInputPromise({ hostId: host.input.id, ...options.partial }, (promise) =>
      prisma.promise.create({
        data: {
          ...promise,
          destinationId: destination?.output.id ?? null,
          themes: { createMany: { data: themeIds.map((id) => ({ themeId: id })) } },
          users: {
            createMany: {
              data: attendeeIds,
            },
          },
        },
      })
    );

    log('Creating a promise');
    return result;
  }

  async function clear() {
    await deleteMany(prisma, range.from, range.to);
  }

  beforeEach(async () => clear());
  afterAll(async () => clear());

  return {
    input: {
      user: createInputUser,
      theme: createInputTheme,
      promise: createInputPromise,
      location: createInputLocation,
      promiseUser: createInputPromiseUser,
      promiseTheme: createInputPromiseThemes,
    },

    write: {
      user: writeUser,
      users: writeUsers,
      theme: writeTheme,
      themes: writeThemes,
      location: writeLocation,
      locations: writeLocations,
      promise: writePromise,
    },

    date: {
      yesterday,
      tomorrow,
    },

    db: {
      clear,
    },
  };

  function log(...messages: any[]) {
    if (!options.logging) return;
    console.log('[FIXTURE]', ...messages);
  }
}

export {
  createLocationBuilder,
  createPromiseThemeBuilder,
  createPromiseUserBuilder,
  createPromiseBuilder,
  createThemeBuilder,
  createUserBuilder,
};
