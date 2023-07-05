import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EntryResponse } from '../dtos/entry.dto';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Ping' })
  @ApiOkResponse({ description: 'Pong', type: [EntryResponse] })
  pong() {
    return {
      message: 'pong',
      version: this.config.get('API_VERSION'),
      build: this.config.get('BUILD'),
      env: this.config.get('NODE_ENV'),
      tz: this.config.get('TZ'),
    };
  }
}