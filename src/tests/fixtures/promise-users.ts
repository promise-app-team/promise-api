import { createModelBuilder } from './builder';

import { PromiseUserModel } from '@/prisma';

export function createPromiseUserBuilder(initialId: number) {
  return createModelBuilder<PromiseUserModel, 'userId' | 'promiseId'>(initialId, () => ({
    userId: 0,
    promiseId: 0,
    startLocationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}
