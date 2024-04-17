import { addHours } from 'date-fns';

import { createModelBuilder } from './builder';

import { DestinationType, LocationShareType, PromiseModel } from '@/prisma/prisma.entity';

export function createPromiseBuilder(initialId: number) {
  return createModelBuilder<Omit<PromiseModel, 'pid'>, 'hostId'>(initialId, (id) => ({
    id,
    title: `title ${id}`,
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
