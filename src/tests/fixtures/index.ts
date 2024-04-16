import {
  PrismaClient,
  User as PrismaUser,
  Location as PrismaLocation,
  Theme as PrismaTheme,
  Promise as PrismaPromise,
  User,
} from '@prisma/client';
import { addDays, formatISO, subDays } from 'date-fns';
import * as R from 'remeda';

import { Result, isResult } from './builder';
import { createLocationBuilder } from './locations';
import { createPromiseThemeBuilder } from './promise-themes';
import { createPromiseUserBuilder } from './promise-users';
import { createPromiseBuilder } from './promises';
import { createThemeBuilder } from './themes';
import { createUserBuilder } from './users';

import { LocationModel, PromiseModel, ThemeModel, UserModel } from '@/prisma/prisma.entity';

type RequiredOption<I, O> = O | Result<I, O>;
type OptionalOption<I, O> = O | Result<I, O> | boolean;
type ArrayOption<I, O> = O[] | Result<I, O>[] | number;

type PromiseCompleteOptions = {
  host?: RequiredOption<UserModel, PrismaUser>;
  destination?: OptionalOption<LocationModel, PrismaLocation>;
  theme?: OptionalOption<ThemeModel, PrismaTheme>;
  themes?: ArrayOption<ThemeModel, PrismaTheme>;
  attendee?: OptionalOption<UserModel, PrismaUser>;
  attendees?: ArrayOption<UserModel, PrismaUser>;
  startLocation?: OptionalOption<LocationModel, PrismaLocation>;
  startLocations?: ArrayOption<LocationModel, PrismaLocation>;
  hostStartLocation?: OptionalOption<LocationModel, PrismaLocation>;
  partial?: Partial<Omit<PromiseModel, 'pid'>>;
};

type IsNotExist<T> = Or<IsFalse<T>, IsUnknown<T>, IsUndefined<T>>;
type RequiredStrictResult<T, U> = T extends U ? Result<U, T> : Result<U>;
type OptionalStrictResult<T, U> = IsNotExist<T> extends true ? never : T extends U ? Result<U, T> : Result<U>;
type ArrayStrictResult<T, U> = T extends U[] ? Result<U, T[number]>[] : Result<U, U>[];
type Normalize<T extends Record<string, any>> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

interface PromiseComplete<Options extends PromiseCompleteOptions> {
  host: RequiredStrictResult<Options['host'], UserModel>;
  destination: OptionalStrictResult<Options['destination'], LocationModel>;
  theme: OptionalStrictResult<Options['theme'], ThemeModel>;
  themes: ArrayStrictResult<Options['themes'], ThemeModel>;
  attendee: OptionalStrictResult<Options['attendee'], UserModel>;
  attendees: ArrayStrictResult<Options['attendees'], UserModel>;
  startLocation: OptionalStrictResult<Options['startLocation'], LocationModel>;
  startLocations: ArrayStrictResult<Options['startLocations'], LocationModel>;
  hostStartLocation: OptionalStrictResult<Options['hostStartLocation'], LocationModel>;
  promise: Result<Omit<PromiseModel, 'pid'>, PrismaPromise>;
}

type ExtractResultOutput<T> =
  T extends Result<any, infer O>
    ? O
    : T extends Record<string, any>
      ? { [K in keyof T]: ExtractResultOutput<T[K]> }
      : T;

type PromiseCompleteOutput<Options extends PromiseCompleteOptions> = Normalize<PromiseComplete<Options>>;

interface TestFixtureOptions {
  logging?: boolean;
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
    const n = Math.max(1, num);
    log(`Creating ${n} users`);
    return Promise.all(R.times(n, () => createInputUser((user) => prisma.user.create({ data: user }))));
  }

  async function writeLocation(partial?: Partial<LocationModel>) {
    R.isNumber(partial?.id) ? log(`Creating a location with id: ${partial.id}`) : log('Creating a location');
    return createInputLocation(partial, (location) => prisma.location.create({ data: location }));
  }

  async function writeLocations(num: number = 3) {
    const n = Math.max(1, num);
    log(`Creating ${n} locations`);
    return Promise.all(R.times(n, () => createInputLocation((location) => prisma.location.create({ data: location }))));
  }

  async function writeTheme(partial?: Partial<ThemeModel>) {
    R.isNumber(partial?.id) ? log(`Creating a theme with id: ${partial.id}`) : log('Creating a theme');
    return createInputTheme(partial, (theme) => prisma.theme.create({ data: theme }));
  }

  async function writeThemes(num: number = 3) {
    const n = Math.max(1, num);
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
      [R.isNullish, () => writeUser()],
      [isResult, (result) => result as any],
      [R.isPlainObject, (input) => new Result(input)],
      R.conditional.defaultCase(() => writeUser())
    );

    result.destination = await R.conditional(
      options.destination,
      [R.isNullish, () => null],
      [isResult, (result) => result as any],
      [R.isPlainObject, (input) => new Result(input)],
      [R.isTruthy, () => writeLocation()],
      R.conditional.defaultCase(() => null)
    );

    result.attendee = await R.conditional(
      options.attendee,
      [R.isNullish, () => null],
      [isResult, (result) => result as any],
      [R.isPlainObject, (input) => new Result(input)],
      [R.isTruthy, () => writeUser()],
      R.conditional.defaultCase(() => null)
    );

    result.attendees = (await R.conditional(
      options.attendees,
      [R.isNullish, () => []],
      [
        R.isArray,
        R.piped(
          R.map((attendee) => {
            if (isResult(attendee)) return attendee;
            if (R.isPlainObject(attendee)) return new Result(attendee);
            return writeUser();
          })
        ),
      ],
      [R.isNumber, (num) => writeUsers(num)],
      R.conditional.defaultCase(() => [])
    )) as any;

    result.startLocation = await R.conditional(
      options.startLocation,
      [R.isNullish, () => null],
      [isResult, (result) => result as any],
      [R.isPlainObject, (input) => new Result(input)],
      [R.isTruthy, () => writeLocation()],
      R.conditional.defaultCase(() => null)
    );

    result.startLocations = (await R.conditional(
      options.startLocations,
      [R.isNullish, () => []],
      [
        R.isArray,
        R.piped(
          R.map((startLocation) => {
            if (isResult(startLocation)) return startLocation;
            if (R.isPlainObject(startLocation)) return new Result(startLocation);
            return writeLocation();
          })
        ),
      ],
      [R.isNumber, (num) => writeLocations(num)],
      R.conditional.defaultCase(() => [])
    )) as any;

    result.hostStartLocation = await R.conditional(
      options.hostStartLocation,
      [R.isNullish, () => null],
      [isResult, (result) => result as any],
      [R.isPlainObject, (input) => new Result(input)],
      [R.isTruthy, () => writeLocation()],
      R.conditional.defaultCase(() => null)
    );

    result.theme = await R.conditional(
      options.theme,
      [R.isNullish, () => null],
      [isResult, (result) => result as any],
      [R.isPlainObject, (input) => new Result(input)],
      [R.isTruthy, () => writeTheme()],
      R.conditional.defaultCase(() => null)
    );

    result.themes = (await R.conditional(
      options.themes,
      [R.isNullish, () => []],
      [
        R.isArray,
        R.piped(
          R.map((theme) => {
            if (isResult(theme)) return theme;
            if (R.isPlainObject(theme)) return new Result(theme);
            return writeTheme();
          })
        ),
      ],
      [R.isNumber, (num) => writeThemes(num)],
      R.conditional.defaultCase(() => [])
    )) as any;

    const { host, destination, attendee, attendees, startLocation, startLocations, hostStartLocation, theme, themes } =
      result;
    startLocations.length = attendees.length;

    const users = [host, attendee, ...attendees];
    const locations = [hostStartLocation, startLocation, ...startLocations];

    const attendeeIds = R.pipe(
      users,
      R.zip.strict(locations),
      R.filter(([attendee]) => R.isTruthy(attendee)),
      R.map(([attendee, startLocation]) => ({
        userId: attendee.output.id,
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

  function createOutputFunction<
    T extends (...args: any[]) => Promise<any>,
    P extends any[] = Parameters<T>,
    R = Awaited<ReturnType<T>>,
  >(writeFunction: T): (...args: P) => Promise<ExtractResultOutput<R>> {
    const extract = (value: any): any => {
      if (isResult(value)) return value.output;
      if (Array.isArray(value)) return value.map(extract);
      if (R.isPlainObject(value)) return R.mapValues(value, extract);
      return value;
    };

    return async (...args) => {
      const result = await writeFunction(...args);
      return extract(result);
    };
  }

  writeUser.output = createOutputFunction(writeUser);
  writeUsers.output = createOutputFunction(writeUsers);
  writeLocation.output = createOutputFunction(writeLocation);
  writeLocations.output = createOutputFunction(writeLocations);
  writeTheme.output = createOutputFunction(writeTheme);
  writeThemes.output = createOutputFunction(writeThemes);

  // 함수로 생성 시 PromiseCompleteOutput 타입이 적용되지 않음.
  writePromise.output = async <Options extends PromiseCompleteOptions>(
    options?: Options
  ): Promise<ExtractResultOutput<PromiseCompleteOutput<Options>>> => {
    return createOutputFunction(writePromise)(options) as any;
  };

  let authUser: User | null = null;
  async function configure(options: { authUser?: User }) {
    authUser = options.authUser ?? null;
  }

  async function resetData() {
    const { from: gte, to: lt } = range;
    await prisma.$transaction([
      prisma.location.deleteMany({ where: { id: { gte, lt } } }),
      prisma.theme.deleteMany({ where: { id: { gte, lt } } }),
      prisma.user.deleteMany({ where: { id: { gte, lt, not: authUser?.id } } }),
      prisma.promise.deleteMany({ where: { id: { gte, lt } } }),
    ]);
  }

  afterEach(async () => {
    await resetData();
  });

  afterAll(async () => {
    authUser = null;
    await resetData();
  });

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

    configure,
    resetData,
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
