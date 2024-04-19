import { Injectable } from '@nestjs/common';

import { ConnectionService } from '../connection';

import { ConnectEventHandler } from './connect';
import { DisconnectEventHandler } from './disconnect';
import { PingEventHandler } from './ping';

interface Event {
  connect: ConnectEventHandler;
  disconnect: DisconnectEventHandler;
  ping: PingEventHandler;
}

@Injectable()
export class EventManager {
  private readonly events: Event;

  constructor(readonly connection: ConnectionService) {
    this.events = {
      connect: new ConnectEventHandler(this.connection),
      disconnect: new DisconnectEventHandler(this.connection),
      ping: new PingEventHandler(this.connection),
    };
  }

  get<T extends keyof Event>(event: T): Event[T] {
    return this.events[event];
  }
}
