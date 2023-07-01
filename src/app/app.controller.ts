import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async pong() {
    return {
      message: 'Promise API',
      version: this.configService.get('API_VERSION'),
      build: this.configService.get('BUILD'),
      env: this.configService.get('NODE_ENV'),
      tz: this.configService.get('TZ'),
    };
  }
}
