import { createModelBuilder } from './builder';

import type { PromiseUserModel } from '@/prisma';

export function createPromiseUserBuilder(initialId: number) {
  return createModelBuilder<PromiseUserModel, 'attendeeId' | 'promiseId'>(initialId, () => ({
    attendeeId: 0,
    promiseId: 0,
    startLocationId: null,
    isMidpointCalculated: false,
    attendedAt: new Date(),
    leavedAt: null,
  }));
}
