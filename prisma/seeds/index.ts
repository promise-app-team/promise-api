import { Provider, DestinationType, LocationShareType, PrismaClient } from '@prisma/client';
import { addHours } from 'date-fns';

function shuffle<T>(array: T[]): T[] {
  let n = Math.min(20, array.length * 2);
  const result = array.slice();
  while (n--) {
    const i = Math.floor(Math.random() * array.length);
    const j = Math.floor(Math.random() * array.length);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArray<T>(array: T[]): T[] {
  return shuffle(array).slice(0, random(0, array.length - 1));
}

function randomPick<T>(array: T[]): T {
  return array[random(0, array.length - 1)];
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
    skipDuplicates: true,
  });

  switch (process.env.NODE_ENV) {
    case 'local':
    case 'development':
      const NUMBER_OF_USERS = 10;

      const constant = {
        providers: Object.values(Provider),
        destinationTypes: Object.values(DestinationType),
        locationShareTypes: Object.values(LocationShareType),
      };

      await prisma.user.createMany({
        data: [...Array(NUMBER_OF_USERS).keys()].map((num) => ({
          username: `test${num}`,
          profileUrl: random(0, 1) ? `${random(0, 9)}` : null,
          provider: num ? randomPick(constant.providers) : Provider.KAKAO,
          providerId: `${num}`,
        })),
      });

      const users = await prisma.user.findMany();
      const themes = await prisma.theme.findMany();

      await Promise.all(
        [...Array(20).keys()].map(async (num) => {
          const randomAttendees = randomArray(users);
          const randomThemes = randomArray(themes);

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

          const destination =
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
            include: { themes: true },
            data: {
              title: `Promise ${num}`,
              hostId: randomPick(users).id,
              themes: {
                create: randomThemes.map((theme) => ({ themeId: theme.id })),
              },
              users: {
                create: randomAttendees.map((user, index) => ({
                  userId: user.id,
                  startLocationId: randomStartLocations[index],
                })),
              },
              destinationType: randomDestinationType,
              destinationId: destination?.id,
              locationShareStartType: randomPick(constant.locationShareTypes),
              locationShareStartValue: Math.floor(Math.random() * 100),
              locationShareEndType: randomPick(constant.locationShareTypes),
              locationShareEndValue: Math.floor(Math.random() * 100),
              promisedAt: addHours(new Date(), Math.floor(Math.random() * 30 * 24)),
            },
          });
        })
      );

      break;
  }
}

const prisma = new PrismaClient();
await prisma.$transaction(async (tx) => main(tx as any));
