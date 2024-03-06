import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { User } from '@prisma/client';

import { AuthUser } from '../auth/auth.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { InputDeleteUser, InputUpdateUser, OutputDeleteUser, UserDTO } from './user.dto';
import { UserService } from './user.service';

import { HttpException } from '@/schema/exception';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'getMyProfile', summary: '인증 사용자 정보 조회' })
  @ApiOkResponse({ type: UserDTO, description: '인증 사용자 정보' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async getMyProfile(@AuthUser() user: User): Promise<UserDTO> {
    return UserDTO.from(user);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'updateMyProfile', summary: '인증 사용자 정보 수정' })
  @ApiOkResponse({ type: UserDTO, description: '수정된 인증 사용자 정보' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async updateMyProfile(@AuthUser() user: User, @Body() body: InputUpdateUser): Promise<UserDTO> {
    return UserDTO.from(await this.userService.update(user, body));
  }

  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'deleteMyProfile', summary: '인증 사용자 정보 삭제' })
  @ApiOkResponse({ description: '인증 사용자 정보 삭제 성공' })
  @ApiUnauthorizedResponse({ type: HttpException, description: '로그인 필요' })
  async deleteMyProfile(@AuthUser() user: User, @Body() body: InputDeleteUser): Promise<OutputDeleteUser> {
    const { id } = await this.userService.delete(user, body.reason);
    return { id };
  }
}
