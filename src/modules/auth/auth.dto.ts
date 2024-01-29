import { IsString } from 'class-validator';

export class InputRefreshToken {
  @IsString()
  refreshToken!: string;
}

export class AuthToken {
  accessToken!: string;
  refreshToken!: string;
}
