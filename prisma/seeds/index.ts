import { Provider, DestinationType, LocationShareType, PrismaClient } from '@prisma/client';
import { addHours, subHours } from 'date-fns';
import { sample, times } from 'remeda';

import { random, randomDate, randomPick } from '../../src/utils/random';

const environment = process.env.NODE_ENV || 'local';

await new PrismaClient().$transaction(async (prisma: any) => {
  await clean(prisma);
  await prepare(prisma);

  if (['local', 'development'].includes(environment)) {
    await mock(prisma);
  }
});

///////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// Helpers ///////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function clean(prisma: PrismaClient) {
  await Promise.all([
    prisma.promiseTheme.deleteMany(),
    prisma.promiseUser.deleteMany(),
    prisma.location.deleteMany(),
    prisma.promise.deleteMany(),
    prisma.theme.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await Promise.all([
    prisma.$queryRaw`ALTER TABLE pm_promise_themes AUTO_INCREMENT = 1;`,
    prisma.$queryRaw`ALTER TABLE pm_promise_users AUTO_INCREMENT = 1`,
    prisma.$queryRaw`ALTER TABLE pm_locations AUTO_INCREMENT = 1`,
    prisma.$queryRaw`ALTER TABLE pm_promises AUTO_INCREMENT = 1`,
    prisma.$queryRaw`ALTER TABLE pm_themes AUTO_INCREMENT = 1`,
    prisma.$queryRaw`ALTER TABLE pm_users AUTO_INCREMENT = 1`,
  ]);
}

async function prepare(prisma: PrismaClient) {
  await prisma.theme.createMany({
    data: ['연인', '친구', '동료', '가족', '지인', '스터디', '썸', '동아리', '동호회', '모임', '모르는 사람'].map(
      (name) => ({ name })
    ),
  });
}

async function mock(prisma: PrismaClient) {
  const MAX_USERS = 50;
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

  const randomAttendeeMap = times(MAX_PROMISES, () => sample(users, random(0, 5)));
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
              data: sample(themes, random(1, 5)).map((theme) => ({ themeId: theme.id })),
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
