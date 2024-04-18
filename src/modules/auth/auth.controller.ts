import { Body, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { HttpException } from '@/common/exceptions/http.exception';
import { Post } from '@/customs/nest/decorators/http-api.decorator';
import { AuthTokenDTO, InputRefreshTokenDTO } from '@/modules/auth/auth.dto';
import { AuthService, AuthServiceError } from '@/modules/auth/auth.service';
import { InputCreateUserDTO, UserService } from '@/modules/user';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) {}

  @Post('login', { description: '로그인 / 회원가입을 수행합니다.' })
  async login(@Body() input: InputCreateUserDTO): Promise<AuthTokenDTO> {
    const user = await this.userService.upsert(input);
    return this.authService.authenticate(user).catch((error) => HttpException.throw(error));
  }

  @Post('refresh', { description: '인증 토큰을 갱신합니다.', exceptions: ['BAD_REQUEST', 'NOT_FOUND'] })
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
