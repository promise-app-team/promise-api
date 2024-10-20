import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class InputRefreshTokenDTO {
  @IsString({ message: 'Refresh 토큰이 필요합니다.' })
  @MinLength(1, { message: 'Refresh 토큰이 필요합니다.' })
  @ApiProperty({ example: 'refresh token' })
  refreshToken!: string
}

export class AuthTokenDTO {
  @ApiProperty({ example: 'access token' })
  accessToken!: string

  @ApiProperty({ example: 'refresh token' })
  refreshToken!: string
}
