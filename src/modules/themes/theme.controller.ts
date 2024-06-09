import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Get } from '@/customs/nest';

import { ThemeDTO } from './theme.dto';
import { ThemeService } from './theme.service';

@ApiTags('Theme')
@ApiBearerAuth()
@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get('', { auth: true, description: '약속 테마 목록을 불러옵니다.' })
  async getThemes(): Promise<ThemeDTO[]> {
    return this.themeService.getThemes().then((themes) => themes.map((theme) => ThemeDTO.from(theme)));
  }
}
