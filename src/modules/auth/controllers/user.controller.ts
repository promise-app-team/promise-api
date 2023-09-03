import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { UserEntity } from '../entities/user.entity';
import { AuthUser } from '../decorators/auth.decorator';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'profile', summary: '인증 사용자 정보 조회' })
  @ApiOkResponse({ type: UserEntity, description: '인증 사용자 정보' })
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async profile(@AuthUser() user: UserEntity): Promise<UserEntity> {
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
