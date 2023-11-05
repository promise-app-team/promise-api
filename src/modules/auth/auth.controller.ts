import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { InputCreateUser } from '../user/user.dto';
import { AuthService } from './auth.service';
import { InputRefreshToken } from './auth.dto';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ operationId: 'login', summary: '회원가입 / 로그인' })
  @ApiBody({ type: InputCreateUser, description: '로그인 정보' })
  @ApiBadRequestResponse({ description: '로그인 실패' })
  async login(@Body() user: InputCreateUser) {
    return this.authService.authenticate(user);
  }

  @Post('refresh')
  @ApiOperation({
    operationId: 'refreshTokens',
    summary: 'Access Token / Refresh Token 갱신',
  })
  @ApiBody({ type: InputRefreshToken, description: '로그인 정보' })
  @ApiBadRequestResponse({ description: '로그인 실패' })
  async refreshTokens(@Body() { refreshToken }: InputRefreshToken) {
    return this.authService.refresh(refreshToken);
  }
}
