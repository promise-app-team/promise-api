export class InputRefreshTokenDto {
  refreshToken!: string;
}

export class OutputAuthTokenDto {
  accessToken!: string;
  refreshToken!: string;
}
