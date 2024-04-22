import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { Controller, Query } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';

import { EventResponse } from './event.dto';
import { EventManager, PingEvent } from './events';

import { ParsedBody } from '@/common/decorators';
import { TypedConfigService } from '@/config/env';
import { LoggerService } from '@/customs/logger';
import { Get, Post } from '@/customs/nest';

@ApiTags('Event')
@Controller('event')
export class EventController {
  private readonly client: ApiGatewayManagementApi;

  constructor(
    private readonly event: EventManager,
    private readonly config: TypedConfigService,
    private readonly logger: LoggerService
  ) {
    const endpoint = this.config.get('aws.websocket.endpoint');
    if (!endpoint) return;

    this.client = new ApiGatewayManagementApi({ endpoint });
    this.logger.setContext(EventController.name);
  }

  @Get('connect')
  async requestConnectEvent(@Query('connectionId') connectionId: string): Promise<EventResponse> {
    this.logger.debug(`Client connected: ${connectionId}`);
    return this.event.get('connect').handle(connectionId);
  }

  @Get('disconnect')
  async requestDisconnectEvent(@Query('connectionId') connectionId: string): Promise<EventResponse> {
    this.logger.debug(`Client disconnected: ${connectionId}`);
    return this.event.get('disconnect').handle(connectionId);
  }

  @Post('ping')
  @ApiBody({ type: PingEvent.DTO.PingEventPayloadDTO })
  async requestPingEvent(
    @Query('connectionId') connectionId: string,
    @ParsedBody() body: PingEvent.Payload
  ): Promise<EventResponse> {
    this.logger.debug(`Client sent message: ${connectionId} with ${JSON.stringify(body.data)}`);
    const handler = this.event.get('ping');
    handler.on('send', async (connection, data) => {
      this.logger.debug(`Sending message to ${connection.id}: ${JSON.stringify(data)}`);
      await this.client
        .postToConnection({ ConnectionId: connection.id, Data: JSON.stringify(data) })
        .catch((error) => this.logger.error(`Failed to send message to ${connection.id}`, error));
      this.logger.debug(`Sent message to ${connection.id}`);
    });
    return handler.handle(connectionId, body.data);
  }
}
