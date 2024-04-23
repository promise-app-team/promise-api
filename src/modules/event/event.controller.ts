import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { Controller, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AuthUser } from '../auth';

import { EventHandler, EventManager, Events } from './events';
import { AbstractEvent } from './events/event.interface';
import { PingEvent } from './events/ping';
import { ShareLocationEvent } from './events/share-location';

import { ParsedBody } from '@/common/decorators';
import { HttpException } from '@/common/exceptions';
import { TypedConfigService } from '@/config/env';
import { InthashService } from '@/customs/inthash';
import { LoggerService } from '@/customs/logger';
import { Get, Post } from '@/customs/nest';
import { UserModel } from '@/prisma';

@ApiTags('Event')
@Controller('event')
export class EventController {
  private readonly client: ApiGatewayManagementApi;

  constructor(
    private readonly event: EventManager,
    private readonly hasher: InthashService,
    private readonly config: TypedConfigService,
    private readonly logger: LoggerService
  ) {
    const endpoint = this.config.get('aws.websocket.endpoint');
    if (!endpoint) return;
    this.client = new ApiGatewayManagementApi({ endpoint });
    this.logger.setContext(EventController.name);
  }

  @Get('connect', { auth: true, description: 'Connect to WebSocket', exceptions: ['FORBIDDEN'] })
  @ApiQuery({ name: 'event', type: 'string', required: true })
  async requestConnectEvent<User extends Pick<UserModel, 'id'>>(
    @AuthUser() user: User,
    @Query('event') event: keyof Events,
    @Query('connectionId') connectionId: string
  ): Promise<AbstractEvent.DTO.EventResponse> {
    try {
      this.logger.debug(`Client connected: ${connectionId}. Joining event: ${event} (User ID: ${user.id})`);
      return await this.event.get(event).connect(connectionId, { userId: user.id });
    } catch (error: any) {
      this.logger.error(`Failed to connect client: ${connectionId}`, error);
      throw HttpException.new(error, 'FORBIDDEN');
    }
  }

  @Get('disconnect', { description: 'Disconnect from WebSocket' })
  async requestDisconnectEvent(@Query('connectionId') connectionId: string): Promise<AbstractEvent.DTO.EventResponse> {
    this.logger.debug(`Client disconnected: ${connectionId}`);
    await EventHandler.disconnect(connectionId);
    return { message: `Disconnected from ${connectionId}` };
  }

  @Post('ping', { description: 'Post message to Ping Event' })
  @ApiBody({ type: PingEvent.DTO.PingEventPayloadDTO })
  async requestPingEvent(
    @Query('connectionId') connectionId: string,
    @ParsedBody('data') data: PingEvent.Data
  ): Promise<AbstractEvent.DTO.EventResponse> {
    this.logger.debug(`Client sent message: ${connectionId} with ${JSON.stringify(data)}`);
    const handler = this.event.get('ping');

    handler.on('send', async (id, data) => {
      this.logger.debug(`Sending message to ${id}: ${JSON.stringify(data)}`);
      try {
        await this.client.postToConnection({ ConnectionId: id, Data: JSON.stringify(data) });
        this.logger.debug(`Sent message to ${id}`);
      } catch (error: any) {
        this.logger.error(`Failed to send message to ${id}`, error);
        if (error.name === 'GoneException') {
          await EventHandler.disconnect(id);
        }
      }
    });

    return handler.handle(connectionId, data);
  }

  @Post('share-location', { description: 'Share location with other attendees' })
  @ApiBody({ type: ShareLocationEvent.DTO.ShareLocationEventPayloadDTO })
  async requestShareLocationEvent(
    @Query('connectionId') connectionId: string,
    @ParsedBody('data') data: ShareLocationEvent.Data
  ): Promise<AbstractEvent.DTO.EventResponse> {
    this.logger.debug(`Client sent location: ${connectionId} with ${JSON.stringify(data)}`);

    const handler = this.event.get('share-location');

    handler.on('share', async (id, data) => {
      try {
        this.logger.debug(`Sharing location to ${id}: ${JSON.stringify(data)}`);
        await this.client.postToConnection({ ConnectionId: id, Data: JSON.stringify(data) });
        this.logger.debug(`Shared location to ${id}`);
      } catch (error: any) {
        this.logger.error(`Failed to share location to ${id}`, error);
        if (error.name === 'GoneException') {
          await EventHandler.disconnect(id);
        }
      }
    });

    data.param.promiseIds = data.param.promiseIds.map((id) => this.hasher.decode(id));
    return handler.handle(connectionId, data);
  }
}
