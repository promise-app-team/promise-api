import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { Controller, Logger, Query } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';

import { EventResponse } from './event.dto';
import { EventManager, PingEvent } from './events';

import { ParsedBody } from '@/common/decorators';
import { TypedConfigService } from '@/config/env';
import { Get, Post } from '@/customs/nest';

@ApiTags('Event')
@Controller('event')
export class EventController {
  private readonly client: ApiGatewayManagementApi;
  private readonly logger: Logger = new Logger(EventController.name);

  constructor(
    private readonly event: EventManager,
    private readonly config: TypedConfigService
  ) {
    const endpoint = this.config.get('aws.websocket.endpoint');
    if (!endpoint) return;

    this.client = new ApiGatewayManagementApi({ endpoint });
  }

  @Get('connect')
  async connect(@Query('connectionId') connectionId: string): Promise<EventResponse> {
    const response = await this.event.get('connect').handle(connectionId);
    const connections = await this.event.connection.getConnections();
    this.logger.log(`[$connect] Created connection: ${connectionId} (total: ${connections.length})`);
    return response;
  }

  @Get('disconnect')
  async disconnect(@Query('connectionId') connectionId: string): Promise<EventResponse> {
    const response = await this.event.get('disconnect').handle(connectionId);
    const connections = await this.event.connection.getConnections();
    this.logger.log(`[$disconnect] Deleted connection: ${connectionId} (total: ${connections.length})`);
    return response;
  }

  @Post('ping')
  @ApiBody({ type: PingEvent.DTO.PingEventPayloadDTO })
  async message(
    @Query('connectionId') connectionId: string,
    @ParsedBody() body: PingEvent.Payload
  ): Promise<EventResponse> {
    const handler = this.event.get('ping');
    handler.on('send', async (connection, data) => {
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
    this.logger.log(`[$ping] Sent message from connection: ${connectionId} with ${JSON.stringify(body.data)}`);
    return response;
  }
}
