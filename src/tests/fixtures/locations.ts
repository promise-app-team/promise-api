import { Prisma } from '@prisma/client';
import { randomString } from 'remeda';

import { createModelBuilder } from './builder';

import { LocationModel } from '@/prisma';

export function createLocationBuilder(initialId: number) {
  return createModelBuilder<LocationModel>(initialId, (id) => ({
    id,
    city: randomString(5),
    district: randomString(5),
    address1: randomString(5),
    address2: randomString(5),
    latitude: randomDecimal(-90, 90),
    longitude: randomDecimal(-180, 180),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function randomDecimal(min: number, max: number) {
  return new Prisma.Decimal(Math.random() * (max - min) + min);
}
