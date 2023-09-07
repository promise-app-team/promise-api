import { OmitType, PartialType } from '@nestjs/swagger';
import {
  DestinationType,
  LocationShareType,
  PromiseEntity,
} from './promise.entity';
import { LocationEntity } from './location.entity';
import { UserEntity } from '../user/user.entity';

export class OutputPromiseListItem extends OmitType(PromiseEntity, [
  'hostId',
  'destinationId',
]) {
  host!: Pick<UserEntity, 'username'>;
  destination!: LocationEntity | null;
  attendees: Pick<UserEntity, 'username'>[] = [];
}

export class InputCreatePromise {
  title!: string;
  themeIds!: number[];
  promisedAt!: number;
  destinationType!: DestinationType;
  destination?: {
    city: string;
    district: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  locationShareStartType!: LocationShareType;
  locationShareStartValue!: number;
  locationShareEndType!: LocationShareType;
  locationShareEndValue!: number;
}

export class OutputCreatePromise {
  id!: number;
  inviteLink!: string;
}

export class InputUpdatePromise extends PartialType(InputCreatePromise) {
  id!: number;
}

export class OutputUpdatePromise {
  id!: number;
}
