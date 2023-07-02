import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  async pong() {
    return {
      message: 'Promise API',
      version: this.config.get('API_VERSION'),
      build: this.config.get('BUILD'),
      env: this.config.get('NODE_ENV'),
      tz: this.config.get('TZ'),
    };
  }
}
