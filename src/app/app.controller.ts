import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { EntryDTO } from './app.dto';

import { TypedConfigService } from '@/config/env';
import { Get } from '@/customs/nest';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly config: TypedConfigService) {}

  @Get('', { description: '서버 상태를 확인합니다.' })
  ping(): EntryDTO {
    return {
      message: 'pong',
      version: this.config.get('version'),
      build: this.config.get('build'),
      deploy: this.config.get('deploy'),
      env: this.config.get('env'),
      tz: this.config.get('tz'),
    };
  }
}
