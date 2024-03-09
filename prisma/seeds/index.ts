import { Provider, DestinationType, LocationShareType, PrismaClient } from '@prisma/client';
import { addHours, subHours } from 'date-fns';
import { shuffle, times } from 'remeda';

function random(): boolean;
function random(min: number, max: number): number;
function random(min?: number, max?: number): number | boolean {
  if (typeof min === 'undefined' || typeof max === 'undefined') {
    return Math.random() < 0.5;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArray<T>(array: T[], length?: number): T[] {
  return shuffle(array).slice(0, length ?? array.length);
}

function randomPick<T>(array: T[]): T {
  return array[random(0, array.length - 1)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main(prisma: PrismaClient) {
  await Promise.all([
    prisma.promiseTheme.deleteMany(),
    prisma.promiseUser.deleteMany(),
    prisma.location.deleteMany(),
    prisma.promise.deleteMany(),
    prisma.theme.deleteMany(),
    prisma.user.deleteMany(),

    prisma.$queryRaw`ALTER TABLE pm_promise_themes AUTO_INCREMENT = 1;`,
    prisma.$queryRaw`ALTER TABLE pm_promise_users AUTO_INCREMENT = 1`,
    prisma.$queryRaw`ALTER TABLE pm_locations AUTO_INCREMENT = 1`,
    prisma.$queryRaw`ALTER TABLE pm_promises AUTO_INCREMENT = 1`,
    prisma.$queryRaw`ALTER TABLE pm_themes AUTO_INCREMENT = 1`,
    prisma.$queryRaw`ALTER TABLE pm_users AUTO_INCREMENT = 1`,
  ]);

  await prisma.theme.createMany({
    data: ['연인', '친구', '동료', '가족', '지인', '스터디', '썸', '동아리', '동호회', '모임', '모르는 사람'].map(
      (name) => ({ name })
    ),
  });

  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const MAX_USERS = 10;
  const MAX_PROMISES = 100;

  const constant = {
    providers: Object.values(Provider),
    destinationTypes: Object.values(DestinationType),
    locationShareTypes: Object.values(LocationShareType),
  };

  await prisma.user.createMany({
    data: times(MAX_USERS, (num) => ({
      username: `user${num + 1}`,
      profileUrl: `${random(1, 9)}`,
      provider: num === 0 ? Provider.KAKAO : randomPick(constant.providers),
      providerId: `${num + 1}`,
    })),
  });

  const users = await prisma.user.findMany();
  const themes = await prisma.theme.findMany();

  const randomAttendeeMap = times(MAX_PROMISES, () => randomArray(users, random(0, MAX_USERS)));
  const randomDestinationTypeMap = times(MAX_PROMISES, () => randomPick(constant.destinationTypes));
  const randomStartLocationsMap = await Promise.all(
    randomAttendeeMap.map((attendees) =>
      Promise.all(
        attendees.map(async () => {
          if (randomPick(constant.destinationTypes) === DestinationType.STATIC) return null;

          return prisma.location
            .create({
              data: {
                city: `Start Location City`,
                district: `Start Location District`,
                address: `Start Location Address`,
                latitude: 37.5665 + Math.random() * 0.1,
                longitude: 126.978 + Math.random() * 0.1,
              },
            })
            .then(({ id }) => id);
        })
      )
    )
  );
  const randomDestinationMap = await Promise.all(
    randomDestinationTypeMap.map((destinationType) => {
      if (destinationType === DestinationType.DYNAMIC) return null;

      return prisma.location.create({
        data: {
          city: `Destination City`,
          district: `Destination District`,
          address: `Destination Address`,
          latitude: 37.5665 + Math.random() * 0.1,
          longitude: 126.978 + Math.random() * 0.1,
        },
      });
    })
  );

  await Promise.all(
    times(MAX_PROMISES, (num) => {
      return prisma.promise.create({
        data: {
          title: `promise ${num}`,
          hostId: randomPick(users).id,
          themes: {
            createMany: {
              data: randomArray(themes, random(1, 5)).map((theme) => ({ themeId: theme.id })),
            },
          },
          users: {
            createMany: {
              data: randomAttendeeMap[num].map((user, index) => ({
                userId: user.id,
                startLocationId: randomStartLocationsMap[num][index],
              })),
            },
          },
          destinationType: randomDestinationTypeMap[num],
          destinationId: randomDestinationMap[num]?.id,
          locationShareStartType: randomPick(constant.locationShareTypes),
          locationShareStartValue: Math.floor(Math.random() * 100),
          locationShareEndType: randomPick(constant.locationShareTypes),
          locationShareEndValue: Math.floor(Math.random() * 100),
          promisedAt: randomDate(subHours(new Date(), 24 * 30), addHours(new Date(), 24 * 30)),
        },
      });
    })
  );
}

const prisma = new PrismaClient();
await prisma.$transaction(async (tx) => main(tx as any));
