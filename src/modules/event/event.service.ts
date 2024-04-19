import { Injectable } from '@nestjs/common';
import * as R from 'remeda';

import { ConnectionService } from './connection.service';
import { Connection, EventResponse } from './event.dto';

import { TypedEventEmitter } from '@/utils';

@Injectable()
export class EventService extends TypedEventEmitter<{
  send: [connection: Pick<Connection, 'id'>, data: EventResponse];
}> {
  constructor(private readonly connector: ConnectionService) {
    super();
  }

  get connections() {
    return this.connector.getConnections();
  }

  async handleConnection(id: string, query: { to: Connection['to'] }) {
    await this.connector.setConnection({ id, to: query.to });
  }

  async handleDisconnect(id: string) {
    await this.connector.delConnection(id);
  }

  async handlePing<T = any>(id: string, data: T) {
    const from = await this.connector.getConnection(id);
    if (!from) {
      this.emit('send', { id }, this.payload(id, { error: `Connection with ID ${id} not found` }));
      return { message: 'Connection not found' };
    }

    if (from.to === 'broadcast') {
      const toConnections = await this.connector.getConnections();
      await Promise.all(
        R.pipe(
          toConnections,
          R.filter((c) => c.id !== from.id),
          R.map((c) => this.emit('send', c, this.payload(from.id, data)))
        )
      );
    } else if (from.to === 'self') {
      this.emit('send', from, this.payload(from.id, data));
    } else if (typeof from.to === 'string') {
      const toConnection = await this.connector.getConnection(from.to);
      if (toConnection) {
        this.emit('send', toConnection, this.payload(from.id, data));
      } else {
        this.emit('send', from, this.payload(from.id, { error: `Connection with ID ${from.to} not found` }));
      }
    }
  }

  private payload<T>(id: string, data: T): EventResponse<T> {
    return {
      from: id,
      timestamp: Date.now(),
      data,
    };
  }
}
