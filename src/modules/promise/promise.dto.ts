import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
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
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { addMinutes, addWeeks, formatISO } from 'date-fns';
import * as R from 'remeda';

import { LocationDTO } from '../locations';
import { ThemeDTO } from '../themes';

import { IsAfter } from '@/common/decorators';
import { ApplyDTO } from '@/common/mixins';
import { DestinationType, LocationShareType, PromiseEntity, UserEntity } from '@/prisma';

export class HostDTO extends ApplyDTO(UserEntity, ['id', 'username', 'profileUrl']) {}
export class AttendeeDTO extends ApplyDTO(UserEntity, ['id', 'username', 'profileUrl'], (obj) => ({
  hasStartLocation: Boolean(obj.hasStartLocation),
})) {
  hasStartLocation!: boolean;
}

export class PromiseDTO extends ApplyDTO(
  PromiseEntity,
  [
    'id',
    'pid',
    'title',
    'destinationType',
    'isLatestDestination',
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
    themes: R.map(obj.themes, ({ theme }) => ThemeDTO.from(theme)),
    destination: obj.destination ? LocationDTO.from(obj.destination) : null,
    attendees: R.map(obj.attendees, ({ attendee, startLocationId }) => ({
      ...AttendeeDTO.from({ ...attendee, hasStartLocation: typeof startLocationId === 'number' }),
    })),
  })
) {
  host!: HostDTO;
  themes!: ThemeDTO[];
  destination!: LocationDTO | null;
  attendees!: AttendeeDTO[];
}

export class PublicPromiseDTO extends PromiseDTO {}

export class InputLocationDTO {
  @IsString({ message: '시/도 이름을 입력해주세요.' })
  @Length(2, 50, { message: '시/도 이름을 2자 이상 50자 이하로 입력해주세요.' })
  @ApiProperty({ example: '서울' })
  city!: string;

  @IsString({ message: '구/군 이름을 입력해주세요.' })
  @Length(2, 50, { message: '구/군 이름을 2자 이상 50자 이하로 입력해주세요.' })
  @ApiProperty({ example: '강남구' })
  district!: string;

  @IsOptional()
  @IsString({ message: '상세 주소를 입력해주세요.' })
  @MaxLength(100, { message: '상세 주소는 최대 100자까지 입력 가능합니다.' })
  @ApiPropertyOptional({ example: '강남대로 123' })
  address!: string | null;

  @IsLatitude({ message: '위도 값을 입력해주세요.' })
  @ApiProperty({ type: Number, example: 37.123456 })
  latitude!: number | string | Prisma.Decimal;

  @IsLongitude({ message: '경도 값을 입력해주세요.' })
  @ApiProperty({ type: Number, example: 127.123456 })
  longitude!: number | string | Prisma.Decimal;
}

export class InputCreatePromiseDTO {
  @IsString({ message: '약속 제목을 입력해주세요.' })
  @MaxLength(50, { message: '약속 제목은 최대 50자까지 입력 가능합니다.' })
  @IsNotEmpty({ message: '약속 제목을 입력해주세요.' })
  @ApiProperty({ example: '새로운 약속' })
  title!: string;

  @IsArray({ message: '약속 테마를 선택해주세요.' })
  @IsInt({ each: true, message: '약속 테마를 선택해주세요.' })
  @Min(1, { each: true })
  @ApiProperty({ example: [1] })
  themeIds!: number[];

  @IsISO8601({ strict: true }, { message: '약속 시간을 입력해주세요.' })
  @IsAfter(() => addMinutes(new Date(), 10), { message: '약속 시간은 현재 시간보다 10분 이후로 입력해주세요.' })
  @ApiProperty({ example: formatISO(addWeeks(new Date(), 1)) })
  promisedAt!: string;

  @IsEnum(DestinationType, { message: '약속 장소 타입을 선택해주세요.' })
  @ApiProperty({ enum: DestinationType, example: DestinationType.STATIC })
  destinationType!: DestinationType;

  @ValidateNested()
  @IsOptional()
  @Type(() => InputLocationDTO)
  @ApiProperty()
  destination!: InputLocationDTO | null;

  @IsEnum(LocationShareType, { message: '위치 공유 시작 조건을 선택해주세요.' })
  @ApiProperty({ example: LocationShareType.TIME })
  locationShareStartType!: LocationShareType;

  @IsInt({ message: '위치 공유 시작 조건 값을 입력해주세요.' })
  @Min(0, { message: '최소 0 이상의 값을 입력해주세요.' })
  @ApiProperty({ example: 5 })
  locationShareStartValue!: number;

  @IsEnum(LocationShareType, { message: '위치 공유 종료 조건을 선택해주세요.' })
  @ApiProperty({ example: LocationShareType.DISTANCE })
  locationShareEndType!: LocationShareType;

  @IsInt({ message: '위치 공유 종료 조건 값을 입력해주세요.' })
  @Min(0, { message: '최소 0 이상의 값을 입력해주세요.' })
  @ApiProperty({ example: 5 })
  locationShareEndValue!: number;
}

export class InputUpdatePromiseDTO extends InputCreatePromiseDTO {}

export class IdentifiableDTO {
  @ApiProperty({ example: 1 })
  id!: number;
}

export class PromiseIdentifiableDTO {
  @ApiProperty({ example: '1' })
  pid!: string;
}
