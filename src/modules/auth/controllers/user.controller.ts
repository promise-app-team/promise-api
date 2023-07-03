import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from '../services/user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  // TODO: 권한 추가
  async user(@Param('id') id: string) {
    return this.userService.findOneById(id);
  }

  // TODO: 데커레이터 추가
  // @Get('my')
  // async my() {}
}
