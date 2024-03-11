import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { IsProfileUrl, ApplyDTO } from '@/common';
import { Provider, UserEntity } from '@/prisma/prisma.entity';

export class UserDTO extends ApplyDTO(UserEntity, ['id', 'username', 'profileUrl', 'provider', 'createdAt']) {}
export class HostDTO extends ApplyDTO(UserEntity, ['id', 'username', 'profileUrl']) {}
export class AttendeeDTO extends ApplyDTO(UserEntity, ['id', 'username', 'profileUrl']) {}

export class InputCreateUserDTO {
  @IsOptional()
  @IsString()
  @Length(1, 80, { message: '이름은 1자 이상 80자 이하로 입력해주세요.' })
  username!: string | null;

  @IsOptional()
  @IsProfileUrl()
  profileUrl!: string | null;

  @IsEnum(Provider)
  provider!: Provider;

  @IsString()
  @Length(1, 100)
  providerId!: string;
}

export class InputUpdateUserDTO extends ApplyDTO(InputCreateUserDTO, ['username', 'profileUrl']) {}

export class InputDeleteUserDTO {
  @IsString({ message: '탈퇴 사유를 입력해주세요' })
  @Length(10, 200, {
    message: '탈퇴 사유는 10자 이상 200자 이하로 입력해주세요.',
  })
  reason!: string;
}

export class OutputDeleteUserDTO extends ApplyDTO(UserEntity, ['id']) {}
