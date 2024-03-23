import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
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
import { filter, map, pipe } from 'remeda';

import { IsAfter } from '@/common/decorators/is-after.decorator';
import { ApplyDTO } from '@/common/mixins/dto.mixin';
import { LocationDTO } from '@/modules/promise/location.dto';
import { DestinationType, LocationShareType, PromiseEntity, UserEntity } from '@/prisma/prisma.entity';

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

export class HostDTO extends PickType(UserEntity, ['id', 'username', 'profileUrl']) {}
export class AttendeeDTO extends PickType(UserEntity, ['id', 'username', 'profileUrl']) {
  hasStartLocation!: boolean;
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
    host: {
      id: obj.host.id,
      username: obj.host.username,
      profileUrl: obj.host.profileUrl,
    },
    themes: map(obj.themes, ({ theme }) => theme.name),
    destination: obj.destination ? LocationDTO.from(obj.destination) : null,
    attendees: pipe(
      obj.users,
      filter(({ user }) => user.id !== obj.host.id),
      map(({ user, startLocationId }) => ({
        id: user.id,
        username: user.username,
        profileUrl: user.profileUrl,
        hasStartLocation: typeof startLocationId === 'number',
      }))
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
  address?: string;

  @IsLatitude({ message: '위도 값을 입력해주세요.' })
  @ApiProperty({ example: 37.123456 })
  latitude!: number;

  @IsLongitude({ message: '경도 값을 입력해주세요.' })
  @ApiProperty({ example: 127.123456 })
  longitude!: number;
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
