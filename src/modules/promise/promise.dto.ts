import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import {
  DestinationType,
  LocationShareType,
  PromiseEntity,
} from './promise.entity';
import { LocationEntity } from './location.entity';
import { UserEntity } from '../user/user.entity';

class Host extends PickType(UserEntity, ['username']) {}
class Attendee extends PickType(UserEntity, ['username']) {}

export class OutputPromiseListItem extends OmitType(PromiseEntity, [
  'hostId',
  'destinationId',
]) {
  themes!: string[];
  host!: Host;
  destination!: LocationEntity | null;
  attendees!: Attendee[];
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

export class InputUpdateUserStartLocation {
  promiseId!: number;
  location!: {
    city: string;
    district: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}
