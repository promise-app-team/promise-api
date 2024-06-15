import { Module } from '@nestjs/common';

import { UserService } from '../user';

import { ThemeController } from './theme.controller';
import { ThemeService } from './theme.service';

@Module({
  controllers: [ThemeController],
  providers: [UserService, ThemeService],
})
export class ThemeModule {}
