import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { ParsedBody } from '@/common/decorators/parsed-body.decorator';
import { TypedConfigService } from '@/config/env';

@Controller('event')
@ApiExcludeController()
export class EventController {
  private readonly client: ApiGatewayManagementApi;

  constructor(private readonly config: TypedConfigService) {
    this.client = new ApiGatewayManagementApi({
      endpoint: this.config.get('aws.websocket_endpoint'),
    });
  }

  @Get('connect')
  connect(@Query('connectionId') connectionId: string) {
    console.log('$connect', { connectionId });
    return { message: 'Connected' };
  }

  @Get('disconnect')
  disconnect(@Query('connectionId') connectionId: string) {
    console.log('$disconnect', { connectionId });
    return { message: 'Disconnected' };
  }

  @Get('message')
  async message(@Query('connectionId') connectionId: string, @ParsedBody() body: any) {
    console.log('message', { connectionId, body });
    const response = await this.client.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(body),
    });
    console.log('response', response);
    return { message: 'Default' };
  }
}
