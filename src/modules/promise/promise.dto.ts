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
  ValidateNested,
} from 'class-validator';
import { addMinutes } from 'date-fns';
import { filter, map, pipe } from 'remeda';

import { IsAfter, ApplyDTO } from '@/common';
import { LocationDTO } from '@/modules/promise/location.dto';
import { AttendeeDTO, HostDTO } from '@/modules/user/user.dto';
import { DestinationType, LocationShareType, PromiseEntity } from '@/prisma/prisma.entity';

export enum PromiseStatus {
  ALL = 'all',
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
}

export enum PromiseUserRole {
  ALL = 'all',
  HOST = 'host',
  ATTENDEE = 'attendee',
}

export class PromiseDTO extends ApplyDTO(
  PromiseEntity,
  [
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
  ],
  (obj) => ({
    host: HostDTO.from(obj.host),
    themes: map(obj.themes, ({ theme }) => theme.name),
    destination: obj.destination ? LocationDTO.from(obj.destination) : null,
    attendees: pipe(
      obj.users,
      filter(({ user }) => user.id !== obj.host.id),
      map(({ user }) => AttendeeDTO.from(user))
    ),
  })
) {
  host!: HostDTO;
  themes!: string[];
  destination!: LocationDTO | null;
  attendees!: AttendeeDTO[];
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

export class InputCreatePromiseDTO {
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

export class InputUpdatePromiseDTO extends InputCreatePromiseDTO {}

export class PromisePidDTO extends ApplyDTO(PromiseEntity, ['pid']) {}
