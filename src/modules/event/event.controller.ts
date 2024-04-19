import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { Controller, Logger, Query } from '@nestjs/common';
import { ApiExcludeController, ApiQuery } from '@nestjs/swagger';

import { ConnectionTo, EventBody } from './event.dto';
import { EventService } from './event.service';

import { ParsedBody } from '@/common/decorators';
import { HttpException } from '@/common/exceptions';
import { TypedConfigService } from '@/config/env';
import { Get } from '@/customs/nest';

@Controller('event')
@ApiExcludeController()
export class EventController {
  private readonly client: ApiGatewayManagementApi;
  private readonly logger = new Logger(EventController.name);

  constructor(
    private readonly config: TypedConfigService,
    private readonly eventService: EventService
  ) {
    const endpoint = this.config.get('aws.websocket.endpoint');
    if (!endpoint) return;

    this.client = new ApiGatewayManagementApi({ endpoint });
    eventService.on('send', async (connection, data) => {
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
  }

  @Get('connect')
  @ApiQuery({
    name: 'to',
    required: false,
    example: `${Object.values(ConnectionTo).join(', ')} or ConnectionID`,
  })
  async connect(@Query('connectionId') connectionId: string, @Query('to') to: ConnectionTo = ConnectionTo.Self) {
    await this.eventService.handleConnection(connectionId, { to });
    const connections = await this.eventService.connections;
    this.logger.log(`[$connect] Created connection: ${connectionId} (total: ${connections.length})`);
    return { message: `Connected to ${to}` };
  }

  @Get('disconnect')
  async disconnect(@Query('connectionId') connectionId: string) {
    await this.eventService.handleDisconnect(connectionId);
    const connections = await this.eventService.connections;
    this.logger.log(`[$disconnect] Deleted connection: ${connectionId} (total: ${connections.length})`);
    return { message: `Disconnected from ${connectionId}` };
  }

  @Get('message')
  async message(@Query('connectionId') connectionId: string, @ParsedBody() body: EventBody) {
    if (body.event === 'ping') {
      await this.eventService.handlePing(connectionId, body);
      this.logger.log(`[$message] Sent message from connection: ${connectionId} with ${JSON.stringify(body.data)}`);
      return { message: 'Message sent' };
    } else {
      throw HttpException.new('Unknown event', 'BAD_REQUEST');
    }
  }
}
