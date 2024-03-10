import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { HttpException } from '@/common';
import { Post } from '@/customs/nest';
import { AuthTokenDTO, InputRefreshTokenDTO } from '@/modules/auth/auth.dto';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { InputCreateUserDTO } from '@/modules/user/user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login', { description: '로그인 / 회원가입을 수행합니다.', exceptions: ['BAD_REQUEST'] })
  async login(@Body() input: InputCreateUserDTO): Promise<AuthTokenDTO> {
    return this.authService.authenticate(input);
  }

  @Post('refresh', { description: '인증 토큰을 갱신합니다.', exceptions: ['BAD_REQUEST'] })
  async refreshTokens(@Body() { refreshToken }: InputRefreshTokenDTO): Promise<AuthTokenDTO> {
    return this.authService.refresh(refreshToken).catch((error) => {
      switch (error) {
        case AuthServiceError.AuthTokenExpired:
        case AuthServiceError.AuthTokenInvalid:
          throw HttpException.new(error, 'BAD_REQUEST');
        case AuthServiceError.UserNotFound:
          throw HttpException.new(error, 'NOT_FOUND');
        default:
          throw HttpException.new(error);
      }
    });
  }
}
