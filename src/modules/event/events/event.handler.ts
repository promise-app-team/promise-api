import { ConnectionID, ConnectionManager, ConnectionScope } from '../connections';

import { AbstractEvent } from './event.interface';

import { CacheService } from '@/customs/cache';
import { TypedEventEmitter, TypedEventListener } from '@/utils';

export abstract class EventHandler<TEvent extends AbstractEvent> {
  protected readonly connection: ConnectionManager;
  protected readonly emitter = new TypedEventEmitter<TEvent['Type']>();
  protected readonly context?: TEvent['Context'];

  constructor(scope: ConnectionScope, cache: CacheService, context?: TEvent['Context']) {
    this.connection = ConnectionManager.forEvent(scope.event, scope.stage, { cache });
    this.context = context;
  }

  async connect(id: ConnectionID, _payload?: Record<string, any>): Promise<TEvent['Response']> {
    const success = await this.connection.setConnection(id);
    if (!success) throw new Error(`Failed to connect to ${id}`);
    return { message: `Connected to ${id}` };
  }

  static async disconnect(id: ConnectionID): Promise<AbstractEvent.Response> {
    await ConnectionManager.delConnection(id);
    return { message: `Disconnected from ${id}` };
  }

  abstract handle(
    id: ConnectionID,
    data: AbstractEvent.Data,
    payload?: Record<string, any>
  ): Promise<TEvent['Response']>;

  private registered = new Set();

  async on<K extends keyof TEvent['Type']>(event: K, listener: TypedEventListener<TEvent['Type']>) {
    if (this.registered.has(event)) return;
    this.registered.add(event);
    this.emitter.on(event as string, listener);
  }

  async off<K extends keyof TEvent['Type']>(event: K, listener: TypedEventListener<TEvent['Type']>) {
    this.registered.delete(event);
    this.emitter.off(event as string, listener);
  }
}
