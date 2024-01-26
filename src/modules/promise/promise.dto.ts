import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import {
  DestinationType,
  LocationShareType,
  PromiseEntity,
} from './promise.entity';
import { LocationEntity } from './location.entity';
import { UserEntity } from '../user/user.entity';

class Host extends PickType(UserEntity, ['id', 'username', 'profileUrl']) {}
class Attendee extends PickType(UserEntity, ['id', 'username', 'profileUrl']) {}
class OutputDestination extends LocationEntity {}
class InputDestination extends OmitType(LocationEntity, [
  'id',
  'createdAt',
  'updatedAt',
]) {}

export class OutputPromiseListItem extends OmitType(PromiseEntity, [
  'id',
  'hostId',
  'destinationId',
]) {
  pid!: string;
  themes!: string[];
  host!: Host;
  destination!: OutputDestination | null;
  attendees!: Attendee[];
}

export class InputCreatePromise {
  title!: string;
  themeIds!: number[];
  promisedAt!: string;
  destinationType!: DestinationType;
  destination!: InputDestination | null;
  locationShareStartType!: LocationShareType;
  locationShareStartValue!: number;
  locationShareEndType!: LocationShareType;
  locationShareEndValue!: number;
}

export class OutputCreatePromise {
  pid!: string;
}

export class InputUpdatePromise extends PartialType(InputCreatePromise) {}

export class OutputUpdatePromise {
  pid!: string;
}

export class InputUpdateUserStartLocation extends PickType(LocationEntity, [
  'city',
  'district',
  'address',
  'latitude',
  'longitude',
]) {}

export class OutputCheckPromiseQueue {
  pid!: string;
}
