import { createModelBuilder } from './builder';

import { Provider, UserModel } from '@/prisma/prisma.entity';

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
