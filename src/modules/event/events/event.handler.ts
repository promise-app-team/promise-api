import { TypedEventEmitter } from '@/utils';

import { ConnectionManager } from '../connections';

import type { AbstractEvent } from './event.interface';
import type { Connection, ConnectionID, ConnectionScope } from '../connections';
import type { CacheService } from '@/customs/cache';
import type { TypedEventListener } from '@/utils';

export abstract class EventHandler<TEvent extends AbstractEvent> {
  protected readonly connectionManager: ConnectionManager;
  protected readonly eventEmitter = new TypedEventEmitter<TEvent['Type']>();
  protected readonly context?: TEvent['Context'];

  constructor(scope: ConnectionScope, cache: CacheService, context?: TEvent['Context']) {
    this.connectionManager = ConnectionManager.forEvent(scope.event, scope.stage, { cache });
    this.context = context;
  }

  async connect(connection: Pick<Connection, 'cid' | 'uid'>): Promise<TEvent['Response']> {
    const success = await this.connectionManager.setConnection(connection, 'default');
    if (!success) throw new Error(`Failed to connect to ${connection.cid} (${connection.uid})`);
    return { message: `Connected to ${connection.cid}` };
  }

  static async disconnect(cid: ConnectionID): Promise<AbstractEvent.Response> {
    await ConnectionManager.delConnection(cid);
    return { message: `Disconnected from ${cid}` };
  }

  abstract handle(
    cid: ConnectionID,
    data: AbstractEvent.Data,
    payload?: Record<string, any>
  ): Promise<TEvent['Response']>;

  private registered = new Set();

  async on<K extends keyof TEvent['Type']>(event: K, listener: TypedEventListener<TEvent['Type']>) {
    if (this.registered.has(event)) return;
    this.registered.add(event);
    this.eventEmitter.on(event as string, listener);
  }

  async off<K extends keyof TEvent['Type']>(event: K, listener: TypedEventListener<TEvent['Type']>) {
    this.registered.delete(event);
    this.eventEmitter.off(event as string, listener);
  }
}
