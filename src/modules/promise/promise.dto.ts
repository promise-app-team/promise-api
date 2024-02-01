import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import {
  DestinationType,
  LocationShareType,
  PromiseEntity,
} from './promise.entity';
import { LocationEntity } from './location.entity';
import { UserEntity } from '../user/user.entity';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsAfter } from '../common/decorators/is-after.decorator';
import { addMinutes } from 'date-fns';

class Host extends PickType(UserEntity, ['id', 'username', 'profileUrl']) {}

class Attendee extends PickType(UserEntity, ['id', 'username', 'profileUrl']) {}

class OutputDestination extends LocationEntity {}

class InputDestination {
  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  city!: string;

  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  district!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  address?: string;

  @IsLatitude()
  @IsNotEmpty()
  latitude!: number;

  @IsLongitude()
  @IsNotEmpty()
  longitude!: number;
}

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
  @IsString()
  @MaxLength(20)
  @IsNotEmpty({ message: '약속 제목을 입력해주세요.' })
  title!: string;

  @IsArray({ message: '약속 테마를 선택해주세요.' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  themeIds!: number[];

  @IsISO8601({ strict: true })
  @IsAfter(addMinutes(new Date(), 10), {
    message: '약속 시간을 최소 10분 이후로 설정해주세요.',
  })
  promisedAt!: string;

  @IsEnum(DestinationType)
  destinationType!: DestinationType;

  @ValidateIf((o) => o.destinationType === DestinationType.Static)
  @ValidateNested()
  @IsNotEmptyObject()
  @Type(() => InputDestination)
  destination!: InputDestination | null;

  @IsEnum(LocationShareType)
  locationShareStartType!: LocationShareType;

  @IsInt()
  @Min(0)
  locationShareStartValue!: number;

  @IsEnum(LocationShareType)
  locationShareEndType!: LocationShareType;

  @IsInt()
  @Min(0)
  locationShareEndValue!: number;
}

export class OutputCreatePromise {
  pid!: string;
}

export class InputUpdatePromise extends PartialType(InputCreatePromise) {}

export class OutputUpdatePromise {
  pid!: string;
}

export class InputUpdateUserStartLocation extends InputDestination {}

export class OutputCheckPromiseQueue {
  pid!: string;
}
