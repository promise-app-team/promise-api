import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InputCreateUserDto } from '../dtos/user.dto';
import { AuthService } from '../services/auth.service';
import { InputRefreshTokenDto } from '../dtos/auth.dto';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '회원가입 / 로그인' })
  @ApiBody({ type: InputCreateUserDto, description: '로그인 정보' })
  @ApiBadRequestResponse({ description: '로그인 실패' })
  async login(@Body() user: InputCreateUserDto) {
    return this.authService.authenticate(user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Access Token / Refresh Token 갱신' })
  @ApiBody({ type: InputRefreshTokenDto, description: '로그인 정보' })
  @ApiBadRequestResponse({ description: '로그인 실패' })
  async refreshToken(@Body() { refreshToken }: InputRefreshTokenDto) {
    return this.authService.refresh(refreshToken);
  }
}
