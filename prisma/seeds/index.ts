import { Provider, DestinationType, LocationShareType, PrismaClient } from '@prisma/client';
import { addHours, subHours } from 'date-fns';
import { range, shuffle } from 'remeda';

function random(): boolean;
function random(min: number, max: number): number;
function random(min?: number, max?: number): number | boolean {
  if (typeof min === 'undefined' || typeof max === 'undefined') {
    return Math.random() < 0.5;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArray<T>(array: T[]): T[] {
  return shuffle(array).slice(0, random(0, array.length - 1));
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

  const constant = {
    providers: Object.values(Provider),
    destinationTypes: Object.values(DestinationType),
    locationShareTypes: Object.values(LocationShareType),
  };

  await prisma.user.createMany({
    data: range(0, MAX_USERS).map((num) => ({
      username: `user${num + 1}`,
      profileUrl: `${random(1, 9)}`,
      provider: num === 0 ? Provider.KAKAO : randomPick(constant.providers),
      providerId: `${num + 1}`,
    })),
  });

  const users = await prisma.user.findMany();
  const themes = await prisma.theme.findMany();

  await Promise.all(
    range(0, 20).map(async (num) => {
      const randomAttendees = randomArray(users).slice(0, random(1, 5));
      const randomThemes = randomArray(themes).slice(0, random(1, 5));

      const randomDestinationType = randomPick(constant.destinationTypes);
      const randomStartLocations = await Promise.all(
        randomAttendees.map(async () => {
          if (random(0, 1) || randomDestinationType === DestinationType.STATIC) {
            return null;
          }

          const location = await prisma.location.create({
            data: {
              city: `Start Location City ${num}`,
              district: `Start Location District ${num}`,
              address: `Start Location Address ${num}`,
              latitude: 37.5665 + Math.random() * 0.1,
              longitude: 126.978 + Math.random() * 0.1,
            },
          });
          return location.id;
        })
      );

      const randomDestination =
        randomDestinationType === DestinationType.DYNAMIC
          ? null
          : await prisma.location.create({
              data: {
                city: `Destination City ${num}`,
                district: `Destination District ${num}`,
                address: `Destination Address ${num}`,
                latitude: 37.5665 + Math.random() * 0.1,
                longitude: 126.978 + Math.random() * 0.1,
              },
            });

      await prisma.promise.create({
        data: {
          title: `promise ${num}`,
          hostId: randomPick(users).id,
          themes: {
            createMany: {
              data: randomThemes.map((theme) => ({ themeId: theme.id })),
            },
          },
          users: {
            createMany: {
              data: randomAttendees.map((user, index) => ({
                userId: user.id,
                startLocationId: randomStartLocations[index],
              })),
            },
          },
          destinationType: randomDestinationType,
          destinationId: randomDestination?.id,
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
