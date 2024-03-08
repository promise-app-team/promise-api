import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiTags,
  ApiCreatedResponse,
} from '@nestjs/swagger';

import { HttpException } from '@/common';
import { AuthTokenDTO, InputRefreshTokenDTO } from '@/modules/auth/auth.dto';
import { AuthService } from '@/modules/auth/auth.service';
import { InputCreateUserDTO } from '@/modules/user/user.dto';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ operationId: 'login', summary: '회원가입 / 로그인' })
  @ApiBody({ type: InputCreateUserDTO, description: '로그인 정보' })
  @ApiBadRequestResponse({ type: HttpException, description: '로그인 실패' })
  async login(@Body() input: InputCreateUserDTO) {
    return this.authService.authenticate(input);
  }

  @Post('refresh')
  @ApiOperation({ operationId: 'refreshTokens', summary: 'Access Token / Refresh Token 갱신' })
  @ApiBody({ type: InputRefreshTokenDTO, description: '로그인 정보' })
  @ApiCreatedResponse({ type: AuthTokenDTO, description: '토큰 갱신 성공' })
  @ApiBadRequestResponse({ type: HttpException, description: '로그인 실패/토큰 만료' })
  async refreshTokens(@Body() { refreshToken }: InputRefreshTokenDTO) {
    return this.authService.refresh(refreshToken);
  }
}
