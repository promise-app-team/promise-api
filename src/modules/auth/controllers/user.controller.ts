import { Controller, Get, Post } from '@nestjs/common';
import { UserService } from '../services/user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async users() {
    return await this.userService.findAll();
  }

  @Post('create')
  async create() {
    return await this.userService.create({
      username: `test${Math.floor(Math.random() * 10000)}`,
    });
  }
}
