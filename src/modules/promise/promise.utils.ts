import { Prisma } from '@prisma/client';
import * as R from 'remeda';

import { InputLocationDTO } from '../locations';

import { PromiseStatus, PromiseUserRole } from './promise.enum';

import { createQueryBuilder } from '@/prisma/utils';

export type FilterOptions = {
  id?: number;
  status?: PromiseStatus;
  role?: PromiseUserRole;
  userId?: number;
};

export function makeUniquePromiseFilter<F extends FilterOptions>(filter: F): Prisma.PromiseWhereUniqueInput {
  return R.mergeAll(makePromiseFilter(filter).AND) as Prisma.PromiseWhereUniqueInput;
}

export function makePromiseFilter(filter: FilterOptions) {
  const qb = createQueryBuilder<Prisma.PromiseWhereInput>();

  if (typeof filter.id === 'number') {
    qb.andWhere({ id: filter.id });
  } else if (typeof filter.id === 'string') {
    throw new Error('Invalid ID');
  }

  if (typeof filter.userId === 'number') {
    qb.andWhere({ OR: [{ hostId: filter.userId }, { attendees: { some: { attendeeId: filter.userId } } }] });

    switch (filter.role) {
      case PromiseUserRole.HOST:
        qb.andWhere({ hostId: filter.userId });
        break;
      case PromiseUserRole.ATTENDEE:
        qb.andWhere({
          NOT: { hostId: filter.userId },
          attendees: { some: { attendeeId: filter.userId } },
        });
        break;
      case PromiseUserRole.ALL:
        qb.andWhere({ OR: [{ hostId: filter.userId }, { attendees: { some: { attendeeId: filter.userId } } }] });
        break;
    }
  }

  switch (filter.status) {
    case PromiseStatus.AVAILABLE:
      qb.andWhere({ promisedAt: { gte: new Date() }, completedAt: null });
      break;
    case PromiseStatus.UNAVAILABLE:
      qb.andWhere({ OR: [{ promisedAt: { lt: new Date() } }, { completedAt: { not: null } }] });
      break;
    case PromiseStatus.ALL:
      break;
  }

  return qb.build();
}

export function isEqualLocation<Location extends InputLocationDTO>(
  loc1: Location | null,
  loc2: Location | null
): boolean {
  if (!loc1 || !loc2) return false;

  const [l1, l2] = R.map(
    [loc1, loc2],
    R.piped(
      (loc) => R.set(loc, 'latitude', new Prisma.Decimal(loc.latitude).toFixed(6)),
      (loc) => R.set(loc, 'longitude', new Prisma.Decimal(loc.longitude).toFixed(6))
    )
  );

  return (
    l1.name === l2.name &&
    l1.city === l2.city &&
    l1.district === l2.district &&
    l1.address1 === l2.address1 &&
    l1.address2 === l2.address2 &&
    l1.latitude === l2.latitude &&
    l1.longitude === l2.longitude
  );
}
