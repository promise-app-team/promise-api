import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from '../services/user.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { AuthUser } from '../decorators/user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: User, description: '인증 사용자 정보' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async profile(@AuthUser() user: User): Promise<User> {
    return user;
  }

  // @Delete()
  // @UseGuards(JwtAuthGuard)
  // @ApiOkResponse({ description: '회원 탈퇴 성공' })
  // @ApiUnauthorizedResponse({ description: '로그인 필요' })
  // async delete(@AuthUser() user: User): Promise<void> {
  // TODO: Incorrect datetime value: '1688545839' for column 'deleted_at' at row 1
  //   await this.userService.delete(user);
  // }
}
