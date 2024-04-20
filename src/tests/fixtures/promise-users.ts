import { createModelBuilder } from './builder';

import { PromiseUserModel } from '@/prisma';

export function createPromiseUserBuilder(initialId: number) {
  return createModelBuilder<PromiseUserModel, 'attendeeId' | 'promiseId'>(initialId, () => ({
    attendeeId: 0,
    promiseId: 0,
    startLocationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}
