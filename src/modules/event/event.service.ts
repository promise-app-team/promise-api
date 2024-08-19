import { Injectable } from '@nestjs/common';

import { InthashService } from '@/customs/inthash';
import { LoggerService } from '@/customs/logger';
import { guard } from '@/utils';

import { ConnectionID, ConnectionUID } from './connections';
import { EventHandler, EventManager, Events, PingEvent, ShareLocationEvent } from './events';

@Injectable()
export class EventService {
  constructor(
    private readonly event: EventManager,
    private readonly hasher: InthashService,
    private readonly logger: LoggerService
  ) {}

  async handleConnection(event: keyof Events, connection: { cid: ConnectionID; uid: ConnectionUID; channel?: string }) {
    const { cid, uid, channel } = connection;
    this.logger.debug(`[EVENT] Trying to connect to ${cid} with ${uid}`);
    const response = this.event.get(event).connect({ cid, uid }, channel);
    this.logger.debug(`[EVENT] Connected to ${cid} with ${JSON.stringify(response)}`);
    return response;
  }

  async handleDisconnection(cid: ConnectionID) {
    this.logger.debug(`[EVENT] Trying to disconnect from ${cid}`);
    await EventHandler.disconnect(cid);
    return { message: `[EVENT] Disconnected from ${cid}` };
  }

  async handlePingEvent(
    connectionId: ConnectionID,
    data: PingEvent.Data,
    onMessage: (
      cid: ConnectionID,
      data: PingEvent.Message<any> | PingEvent.Message<PingEvent.MessageError>
    ) => Promise<any>,
    onError: (error: any) => Promise<any>
  ) {
    this.logger.debug(`[PING] Trying to send message: ${connectionId} with ${JSON.stringify(data)}`);

    const handler = this.event.get('ping');

    handler.on('send', async (cid, data) => {
      try {
        this.logger.debug(`[PING] Sending message to ${cid}: ${JSON.stringify(data)}`);
        await onMessage(cid, data);
        this.logger.debug(`[PING] Sent message to ${cid}`);
      } catch (error: any) {
        this.logger.error(`[PING] Failed to send message to ${cid}`, error);
        await onError(error);
      }
    });

    handler.on('error', async (cid, error) => {
      try {
        await onMessage(cid, error);
      } catch (error: any) {
        this.logger.error(`[PING] Failed to send error to ${cid}`, error);
        await onError(error);
      }
    });

    return handler.handle(connectionId, data);
  }

  async handleShareLocationEvent(
    connectionId: ConnectionID,
    data: ShareLocationEvent.Data,
    onMessage: (
      cid: ConnectionID,
      data:
        | ShareLocationEvent.Message<ShareLocationEvent.MessageData>
        | ShareLocationEvent.Message<ShareLocationEvent.MessageError>
    ) => Promise<any>,
    onError: (error: any) => Promise<any>
  ) {
    this.logger.debug(`[SHARE-LOCATION] Trying to share location: ${connectionId} with ${JSON.stringify(data)}`);

    const handler = this.event.get('share-location');

    handler.on('share', async (cid, data) => {
      try {
        this.logger.debug(`[SHARE-LOCATION] Sharing location to ${cid}: ${JSON.stringify(data)}`);
        await onMessage(cid, data);
        this.logger.debug(`[SHARE-LOCATION] Shared location to ${cid}`);
      } catch (error: any) {
        this.logger.error(`[SHARE-LOCATION] Failed to share location to ${cid}`, error);
        await onError(error);
      }
    });

    handler.on('error', async (cid, error) => {
      try {
        await onMessage(cid, error);
      } catch (error: any) {
        this.logger.error(`[SHARE-LOCATION] Failed to send error to ${cid}`, error);
        await onError(error);
      }
    });

    data.param.__promiseIds = guard(() => data.param.promiseIds.map((id) => this.hasher.decode(id)), []);

    return handler.handle(connectionId, data);
  }
}
