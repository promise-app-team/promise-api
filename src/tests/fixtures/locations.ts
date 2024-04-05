import { Prisma } from '@prisma/client';

import { createModelBuilder } from './builder';

import { LocationModel } from '@/prisma/prisma.entity';

export function createLocationBuilder(initialId: number) {
  return createModelBuilder<LocationModel>(initialId, (id) => ({
    id,
    city: `city ${id}`,
    district: `district ${id}`,
    address: `address ${id}`,
    latitude: new Prisma.Decimal(37.123456),
    longitude: new Prisma.Decimal(127.123456),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}
