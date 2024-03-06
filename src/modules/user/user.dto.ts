import { PartialType, PickType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { pick } from 'remeda';

import { IsProfileUrl, ApplyDTO } from '@/common';
import { Provider, UserEntity } from '@/prisma';

const userKeys = ['id', 'username', 'profileUrl', 'provider', 'createdAt'] as const;

export class UserDTO extends ApplyDTO(PickType(UserEntity, userKeys), (obj: UserEntity) => pick(obj, userKeys)) {}

export class InputCreateUser {
  @IsOptional()
  @IsString()
  @Length(1, 80, { message: '이름은 1자 이상 80자 이하로 입력해주세요.' })
  username?: string | null;

  @IsOptional()
  @IsProfileUrl()
  profileUrl?: string | null;

  @IsEnum(Provider)
  provider!: Provider;

  @IsString()
  @Length(1, 100)
  providerId!: string;
}

export class InputUpdateUser extends PartialType(PickType(InputCreateUser, ['username', 'profileUrl'])) {}

export class InputDeleteUser {
  @IsString({ message: '탈퇴 사유를 입력해주세요' })
  @Length(10, 200, {
    message: '탈퇴 사유는 10자 이상 200자 이하로 입력해주세요.',
  })
  reason!: string;
}

export class OutputDeleteUser {
  id!: number;
}
