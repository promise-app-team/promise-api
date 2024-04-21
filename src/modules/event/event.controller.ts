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
    this.logger.debug(`Initialized webSocket client with endpoint: ${endpoint}`);
  }

  @Get('connect')
  async connect(@Query('connectionId') connectionId: string): Promise<EventResponse> {
    this.logger.debug(`Creating connection: ${connectionId}`);
    const response = await this.event.get('connect').handle(connectionId);
    const connections = await this.event.connection.getConnections();
    this.logger.debug(`Created connection: ${connectionId} (total: ${connections.length})`);
    return response;
  }

  @Get('disconnect')
  async disconnect(@Query('connectionId') connectionId: string): Promise<EventResponse> {
    this.logger.debug(`Deleting connection: ${connectionId}`);
    const response = await this.event.get('disconnect').handle(connectionId);
    const connections = await this.event.connection.getConnections();
    this.logger.debug(`Deleted connection: ${connectionId} (total: ${connections.length})`);
    return response;
  }

  @Post('ping')
  @ApiBody({ type: PingEvent.DTO.PingEventPayloadDTO })
  async message(
    @Query('connectionId') connectionId: string,
    @ParsedBody() body: PingEvent.Payload
  ): Promise<EventResponse> {
    const handler = this.event.get('ping');
    this.logger.debug(`Sending message from connection: ${connectionId}`);
    handler.on('send', async (connection, data) => {
      this.logger.debug(`Sending message to connection: ${connection.id}`);
      await this.client
        .postToConnection({
          ConnectionId: connection.id,
          Data: JSON.stringify(data),
        })
        .catch((error) => {
          if (error.name === 'GoneException') {
            this.logger.error(`Connection ${connection.id} is gone`);
          } else {
            this.logger.error(`Failed to send message to ${connection.id}: ${error.message}`);
          }
        });
    });
    const response = await this.event.get('ping').handle(connectionId, body.data);
    this.logger.debug(`Sent message from connection: ${connectionId} with ${JSON.stringify(body.data)}`);
    return response;
  }
}
