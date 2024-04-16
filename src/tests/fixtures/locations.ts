import { Prisma } from '@prisma/client';

import { createModelBuilder } from './builder';

import { LocationModel } from '@/prisma/prisma.entity';

export function createLocationBuilder(initialId: number) {
  return createModelBuilder<LocationModel>(initialId, (id) => ({
    id,
    city: `city ${id}`,
    district: `district ${id}`,
    address: `address ${id}`,
    latitude: randomDecimal(-90, 90),
    longitude: randomDecimal(-180, 180),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function randomDecimal(min: number, max: number) {
  return new Prisma.Decimal(Math.random() * (max - min) + min);
}
