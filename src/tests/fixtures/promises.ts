import { addHours } from 'date-fns';
import { randomString } from 'remeda';

import { DestinationType, LocationShareType } from '@/prisma';

import { createModelBuilder } from './builder';

import type { PromiseModel } from '@/prisma';

export function createPromiseBuilder(initialId: number) {
  return createModelBuilder<Omit<PromiseModel, 'pid'>, 'hostId'>(initialId, (id) => ({
    id,
    title: randomString(10),
    hostId: 0,
    destinationType: DestinationType.STATIC,
    destinationId: null,
    isLatestDestination: false,
    locationShareStartType: LocationShareType.TIME,
    locationShareStartValue: id,
    locationShareEndType: LocationShareType.TIME,
    locationShareEndValue: id,
    promisedAt: addHours(new Date(), 1),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}
