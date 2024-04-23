import { ConnectionID, ConnectionManager, ConnectionScope } from '../connections';

import { EventPayload, EventResponse } from './event.dto';

import { CacheService } from '@/customs/cache';
import { TypedEventEmitter, TypedEventListener } from '@/utils';

export abstract class EventHandler<TEvents extends Record<string, any>, TContext extends Record<string, any> = never> {
  protected readonly connection: ConnectionManager;
  protected readonly emitter = new TypedEventEmitter<TEvents>();
  protected readonly context?: TContext;

  constructor(scope: ConnectionScope, cache: CacheService, context?: TContext) {
    this.connection = ConnectionManager.forEvent(scope.event, scope.stage, { cache });
    this.context = context;
  }

  async connect(id: ConnectionID): Promise<EventResponse> {
    await this.connection.setConnection(id);
    return { message: `Connected to ${id}` };
  }

  static async disconnect(id: ConnectionID): Promise<EventResponse> {
    await ConnectionManager.delConnection(id);
    return { message: `Disconnected from ${id}` };
  }

  abstract handle(id: ConnectionID, data: EventPayload['data']): Promise<EventResponse>;

  private registered = new Set();

  async on<K extends keyof TEvents>(event: K, listener: TypedEventListener<TEvents>) {
    if (this.registered.has(event)) return;
    this.registered.add(event);
    this.emitter.on(event as string, listener);
  }

  async off<K extends keyof TEvents>(event: K, listener: TypedEventListener<TEvents>) {
    this.registered.delete(event);
    this.emitter.off(event as string, listener);
  }
}
