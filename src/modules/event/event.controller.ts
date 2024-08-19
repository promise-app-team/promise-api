import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { Controller, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ParsedBody } from '@/common/decorators';
import { HttpException } from '@/common/exceptions';
import { TypedConfigService } from '@/config/env';
import { LoggerService } from '@/customs/logger';
import { Get, Post } from '@/customs/nest';
import { UserModel } from '@/prisma';

import { AuthUser } from '../auth';

import { ConnectionID } from './connections';
import { EventService } from './event.service';
import { EventHandler, Events } from './events';
import { AbstractEvent } from './events/event.interface';
import { PingEvent } from './events/ping';
import { ShareLocationEvent } from './events/share-location';

@ApiTags('Event')
@Controller('event')
export class EventController {
  private readonly client: ApiGatewayManagementApi;

  constructor(
    private readonly service: EventService,
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
    @Query('channel') channel: string,
    @Query('connectionId') connectionId: ConnectionID
  ): Promise<AbstractEvent.DTO.EventResponse> {
    try {
      return await this.service.handleConnection(event, { cid: connectionId, uid: user.id, channel });
    } catch (error: any) {
      this.logger.error(`Failed to connect client: ${connectionId}`, error);
      throw HttpException.new(error, 'FORBIDDEN');
    }
  }

  @Get('disconnect', { description: 'Disconnect from WebSocket' })
  async requestDisconnectEvent(
    @Query('connectionId') connectionId: ConnectionID
  ): Promise<AbstractEvent.DTO.EventResponse> {
    try {
      return await this.service.handleDisconnection(connectionId);
    } catch (error: any) {
      this.logger.error(`Failed to disconnect client: ${connectionId}`, error);
      throw HttpException.new(error, 'FORBIDDEN');
    }
  }

  @Post('ping', { description: 'Post message to Ping Event', exceptions: ['BAD_REQUEST'] })
  @ApiBody({ type: PingEvent.DTO.PingEventPayloadDTO })
  async requestPingEvent(
    @Query('connectionId') connectionId: ConnectionID,
    @ParsedBody('data') data: PingEvent.Data
  ): Promise<AbstractEvent.DTO.EventResponse> {
    return this.service.handlePingEvent(
      connectionId,
      data,
      async (cid, data) => this.client.postToConnection({ ConnectionId: cid, Data: JSON.stringify(data) }),
      async (error) => error.name === 'GoneException' && EventHandler.disconnect(connectionId)
    );
  }

  @Post('share-location', { description: 'Share location with other attendees' })
  @ApiBody({ type: ShareLocationEvent.DTO.ShareLocationEventPayloadDTO })
  async requestShareLocationEvent(
    @Query('connectionId') connectionId: ConnectionID,
    @ParsedBody('data') data: ShareLocationEvent.Data
  ): Promise<AbstractEvent.DTO.EventResponse> {
    return this.service.handleShareLocationEvent(
      connectionId,
      data,
      async (cid, data) => this.client.postToConnection({ ConnectionId: cid, Data: JSON.stringify(data) }),
      async (error) => error.name === 'GoneException' && EventHandler.disconnect(connectionId)
    );
  }
}
