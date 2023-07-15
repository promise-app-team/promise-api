import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from '../dtos/user.dto';
import { AuthService } from '../services/auth.service';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: CreateUserDto, description: '로그인 정보' })
  @ApiBadRequestResponse({ description: '로그인 실패' })
  async login(@Body() user: CreateUserDto) {
    return this.authService.authenticate(user);
  }
}
