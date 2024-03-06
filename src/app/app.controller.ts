import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { EntryDTO } from '@/app/entry.dto';
import { TypedConfigService } from '@/common';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly config: TypedConfigService) {}

  @Get()
  @ApiOperation({ operationId: 'ping', summary: 'Ping / Pong' })
  @ApiOkResponse({ type: EntryDTO, description: 'ping' })
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
