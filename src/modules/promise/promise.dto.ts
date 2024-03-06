import { PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateBy,
  ValidateNested,
} from 'class-validator';
import { addMinutes } from 'date-fns';
import { filter, map, pick, pipe } from 'remeda';

import { LocationDTO } from './location.dto';

import { IsAfter } from '@/common/decorators/is-after.decorator';
import { ApplyDTO } from '@/common/mixins/dto.mixin';
import { DestinationType, LocationShareType, PromiseEntity, UserEntity } from '@/prisma';

const promiseKeys = [
  'id',
  'pid',
  'title',
  'destinationType',
  'locationShareStartType',
  'locationShareStartValue',
  'locationShareEndType',
  'locationShareEndValue',
  'promisedAt',
  'completedAt',
  'createdAt',
] as const;

const hostKeys = ['id', 'username', 'profileUrl'] as const;

const attendeeKeys = ['id', 'username', 'profileUrl'] as const;

class Host extends PickType(UserEntity, hostKeys) {}

class Attendee extends PickType(UserEntity, attendeeKeys) {}

export class PromiseDTO extends ApplyDTO(PickType(PromiseEntity, promiseKeys), (obj: PromiseEntity) => ({
  ...pick(obj, promiseKeys),
  host: pick(obj.host, hostKeys),
  themes: map(obj.themes, ({ theme }) => theme.name),
  destination: obj.destination ? LocationDTO.from(obj.destination) : null,
  attendees: pipe(
    obj.users,
    filter(({ user }) => user.id !== obj.host.id),
    map(({ user }) => pick(user, attendeeKeys))
  ),
})) {
  host!: Host;
  themes!: string[];
  destination!: LocationDTO | null;
  attendees!: Attendee[];
}

export class PublicPromiseDTO extends PromiseDTO {}

export class InputLocationDTO {
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

export class InputPromiseDTO {
  @IsString()
  @MaxLength(50)
  @IsNotEmpty({ message: '약속 제목을 입력해주세요.' })
  title!: string;

  @IsArray({ message: '약속 테마를 선택해주세요.' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  themeIds!: number[];

  @IsISO8601({ strict: true })
  @IsAfter(() => addMinutes(new Date(), 10))
  promisedAt!: string;

  @IsEnum(DestinationType)
  destinationType!: DestinationType;

  @ValidateNested()
  @IsOptional()
  @ValidateBy({
    name: 'isNotEmptyObject',
    validator(value: any) {
      console.log(value);
    },
  })
  @Type(() => InputLocationDTO)
  destination!: InputLocationDTO | null;

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

export class PromisePidDTO extends ApplyDTO(PickType(PromiseEntity, ['pid']), (obj: PromiseEntity) =>
  pick(obj, ['pid'])
) {}

export class NestedTestDTO {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class TestDTO {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ValidateNested()
  @Type(() => NestedTestDTO)
  subtitle!: NestedTestDTO | null;
}
