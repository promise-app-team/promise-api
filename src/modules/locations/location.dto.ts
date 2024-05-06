import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsLatitude, IsLongitude, IsOptional, IsString, Length, MaxLength } from 'class-validator';

import { ApplyDTO } from '@/common/mixins';
import { LocationEntity } from '@/prisma';

export class PointDTO {
  ref: string;
  latitude: number;
  longitude: number;
}

export class LocationDTO extends ApplyDTO(
  LocationEntity,
  ['id', 'city', 'district', 'address1', 'address2'],
  (obj) => ({
    latitude: parseFloat(`${obj.latitude}`),
    longitude: parseFloat(`${obj.longitude}`),
  })
) {
  latitude: number;
  longitude: number;
}

export class InputLocationDTO {
  @IsString({ message: '시/도 이름을 입력해주세요.' })
  @Length(2, 10, { message: '시/도 이름을 10자 이하로 입력해주세요.' })
  @ApiProperty({ example: '서울' })
  city!: string;

  @IsString({ message: '구/군 이름을 입력해주세요.' })
  @Length(2, 5, { message: '구/군 이름을 5자 이하로 입력해주세요.' })
  @ApiProperty({ example: '강남구' })
  district!: string;

  @IsString({ message: '도로명/지번 주소를 입력해주세요.' })
  @Length(2, 20, { message: '도로명/지번 주소를 20자 이하로 입력해주세요.' })
  @ApiProperty({ example: '강남대로 123' })
  address1!: string;

  @IsOptional()
  @IsString({ message: '상세 주소를 입력해주세요.' })
  @MaxLength(100, { message: '상세 주소는 최대 100자까지 입력 가능합니다.' })
  @ApiPropertyOptional({ example: '101동 202호' })
  address2!: string | null;

  @IsLatitude({ message: '위도 값을 입력해주세요.' })
  @ApiProperty({ type: Number, example: 37.123456 })
  latitude!: number | string | Prisma.Decimal;

  @IsLongitude({ message: '경도 값을 입력해주세요.' })
  @ApiProperty({ type: Number, example: 127.123456 })
  longitude!: number | string | Prisma.Decimal;
}
