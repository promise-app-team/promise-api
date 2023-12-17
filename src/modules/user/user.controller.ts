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
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
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
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
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
  @ApiUnauthorizedResponse({ description: '로그인 필요' })
  async deleteMyProfile(
    @AuthUser() user: UserEntity,
    @Body() body: InputDeleteUser
  ): Promise<void> {
    if (user.deletedAt) {
      throw new BadRequestException('이미 탈퇴한 계정입니다.');
    }

    body.reason = body.reason?.trim();
    if (!body.reason) {
      throw new BadRequestException('탈퇴 사유를 입력해주세요.');
    }

    if (body.reason.length < 10 || body.reason.length > 200) {
      throw new BadRequestException(
        '탈퇴 사유는 10자 이상 200자 이하로 입력해주세요.'
      );
    }

    await this.userService.delete(user, body.reason);
  }
}
