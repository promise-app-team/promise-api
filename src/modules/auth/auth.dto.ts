import { IsString } from 'class-validator';

export class InputRefreshTokenDTO {
  @IsString()
  refreshToken!: string;
}

export class AuthTokenDTO {
  accessToken!: string;
  refreshToken!: string;
}
