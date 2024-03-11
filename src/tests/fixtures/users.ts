import { Provider, UserModel } from '@/prisma/prisma.entity';

export const userBuilder =
  (TEST_ID: number) =>
  (id = TEST_ID++) =>
    ({
      id,
      username: 'username',
      profileUrl: 'http://profile.url',
      provider: Provider.KAKAO,
      providerId: `${id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedAt: new Date(),
    }) satisfies UserModel;
