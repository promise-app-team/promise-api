import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { IsProfileUrl } from '@/common/decorators/is-profile-url.decorator';
import { ApplyDTO } from '@/common/mixins/dto.mixin';
import { Provider, UserEntity } from '@/prisma/prisma.entity';

export class UserDTO extends ApplyDTO(UserEntity, ['id', 'username', 'profileUrl', 'provider', 'createdAt']) {}

export class InputCreateUserDTO {
  @IsOptional()
  @IsString({ message: '이름을 입력해주세요.' })
  @Length(1, 80, { message: '이름을 1자 이상 80자 이하로 입력해주세요.' })
  @ApiPropertyOptional({ example: 'probee' })
  username!: string | null;

  @IsOptional()
  @IsProfileUrl({ message: '프로필 이미지 URL 형식이 올바르지 않습니다.' })
  @ApiPropertyOptional({ example: 'https://profile-url.png' })
  profileUrl!: string | null;

  @IsEnum(Provider, { message: 'OAuth 인증회사를 입력해주세요.' })
  @ApiProperty({ enum: Provider, example: Provider.KAKAO })
  provider!: Provider;

  @IsString()
  @Length(1, 100, { message: 'OAuth 인증 ID를 1자 이상 100자 이하로 입력해주세요.' })
  @ApiProperty({ example: '1234567890' })
  providerId!: string;
}

export class InputUpdateUserDTO extends ApplyDTO(InputCreateUserDTO, ['username', 'profileUrl']) {}

export class InputDeleteUserDTO {
  @IsString({ message: '탈퇴 사유를 입력해주세요' })
  @Length(10, 200, { message: '탈퇴 사유는 10자 이상 200자 이하로 입력해주세요.' })
  @ApiProperty({ example: '탈퇴 사유' })
  reason!: string;
}

export class OutputDeleteUserDTO extends ApplyDTO(UserEntity, ['id']) {}
