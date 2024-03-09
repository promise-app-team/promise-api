import { Body, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';

import { Delete, Get, Put } from '@/customs/nest';
import { AuthUser } from '@/modules/auth/auth.decorator';
import { InputDeleteUserDTO, InputUpdateUserDTO, OutputDeleteUserDTO, UserDTO } from '@/modules/user/user.dto';
import { UserService } from '@/modules/user/user.service';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile', { auth: true, description: '로그인한 사용자 정보를 불러옵니다.' })
  async getMyProfile(@AuthUser() user: User): Promise<UserDTO> {
    return UserDTO.from(user);
  }

  @Put('profile', { auth: true, description: '로그인한 사용자 정보를 수정합니다.' })
  async updateMyProfile(@AuthUser() user: User, @Body() body: InputUpdateUserDTO): Promise<UserDTO> {
    return this.userService.update(user, body).then((user) => UserDTO.from(user));
  }

  @Delete('profile', { auth: true, description: '로그인한 사용자 정보를 삭제합니다.' })
  async deleteMyProfile(@AuthUser() user: User, @Body() body: InputDeleteUserDTO): Promise<OutputDeleteUserDTO> {
    return this.userService.delete(user, body.reason).then((user) => OutputDeleteUserDTO.from(user));
  }
}
