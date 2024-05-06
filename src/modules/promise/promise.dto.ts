import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { addMinutes, addWeeks, formatISO } from 'date-fns';
import * as R from 'remeda';

import { InputLocationDTO, LocationDTO } from '../locations';
import { ThemeDTO } from '../themes';

import { IsAfter } from '@/common/decorators';
import { ApplyDTO } from '@/common/mixins';
import { DestinationType, LocationShareType, PromiseEntity, UserEntity } from '@/prisma';

export class HostDTO extends ApplyDTO(UserEntity, ['id', 'username', 'profileUrl']) {}

export class AttendeeDTO extends ApplyDTO(UserEntity, ['id', 'username', 'profileUrl'], (obj) => ({
  hasStartLocation: Boolean(obj.hasStartLocation),
  isMidpointCalculated: Boolean(obj.isMidpointCalculated),
  attendedAt: obj.attendedAt,
  leavedAt: obj.leavedAt,
})) {
  hasStartLocation!: boolean;
  attendedAt!: Date;
  leavedAt!: Date | null;
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
    attendees: R.map(obj.attendees, (promiseUser) => ({
      ...AttendeeDTO.from({
        ...promiseUser.attendee,
        hasStartLocation: typeof promiseUser.startLocationId === 'number',
        isMidpointCalculated: promiseUser.isMidpointCalculated,
        attendedAt: promiseUser.attendedAt,
        leavedAt: promiseUser.leavedAt,
      }),
    })),
  })
) {
  host!: HostDTO;
  themes!: ThemeDTO[];
  destination!: LocationDTO | null;
  attendees!: AttendeeDTO[];
}

export class PublicPromiseDTO extends PromiseDTO {}

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

export class InputUpdatePromiseDTO extends InputCreatePromiseDTO {
  @ValidateIf((obj) => obj.destinationType === DestinationType.DYNAMIC && !!obj.destination)
  @IsNotEmpty({ message: '중간 위치 Ref ID를 입력해주세요.' })
  middleLocationRef?: string | null;
}

export class IdentifiableDTO {
  @ApiProperty({ example: 1 })
  id!: number;
}

export class PromiseIdentifiableDTO {
  @ApiProperty({ example: '1' })
  pid!: string;
}
