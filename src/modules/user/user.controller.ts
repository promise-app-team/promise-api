import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UserEntity } from './user.entity';
import { AuthUser } from '../auth/auth.decorator';
import { UserService } from './user.service';
import { InputDeleteUser, InputUpdateUser } from './user.dto';
import { HttpException } from '@/schema/exception';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    operationId: 'getMyProfile',
    summary: '인증 사용자 정보 조회',
  })
  @ApiOkResponse({ type: UserEntity, description: '인증 사용자 정보' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async getMyProfile(@AuthUser() user: UserEntity): Promise<UserEntity> {
    return user;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    operationId: 'updateMyProfile',
    summary: '인증 사용자 정보 수정',
  })
  @ApiOkResponse({ type: UserEntity, description: '수정된 인증 사용자 정보' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async updateMyProfile(
    @AuthUser() user: UserEntity,
    @Body() body: InputUpdateUser
  ): Promise<UserEntity> {
    return this.userService.update(user, body);
  }

  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    operationId: 'deleteMyProfile',
    summary: '인증 사용자 정보 삭제',
  })
  @ApiOkResponse({ description: '인증 사용자 정보 삭제 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async deleteMyProfile(
    @AuthUser() user: UserEntity,
    @Body() body: InputDeleteUser
  ): Promise<void> {
    await this.userService.delete(user, body.reason);
  }
}
