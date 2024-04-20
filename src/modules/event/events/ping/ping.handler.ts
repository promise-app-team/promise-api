import { ConnectionService } from '../../connection';
import { EventResponse } from '../../event.dto';
import { EventHandler } from '../event.handler';

import { PingEvent } from './ping.dto';
import { Strategy, StrategyManager } from './strategies';

import { TypedEventEmitter, TypedEventListener } from '@/utils';

export class PingEventHandler implements EventHandler {
  private readonly strategy: StrategyManager;
  private readonly emitter = new TypedEventEmitter<PingEvent.Type>();

  constructor(private readonly connection: ConnectionService) {
    this.strategy = new StrategyManager(this.connection, this.emitter);
  }

  async handle(id: string, data: PingEvent.Payload['data']): Promise<EventResponse> {
    const strategy = data.param?.strategy;
    if (!strategy) {
      const error = `Strategy not found`;
      await this.strategy.get('common').post(id, { body: { error } });
      return { message: error };
    }

    const handler: Strategy = this.strategy.get(strategy);
    if (!handler) {
      const error = `Strategy '${strategy}' not found`;
      await this.strategy.get('common').post(id, { body: { error } });
      return { message: error };
    }

    await handler.post(id, data);

    return { message: 'pong' };
  }

  private registered = new Set<string>();

  async on<K extends keyof PingEvent.Type>(event: K, listener: TypedEventListener<PingEvent.Type>) {
    if (this.registered.has(event)) return;
    this.registered.add(event);
    this.emitter.on(event, listener);
  }

  async off<K extends keyof PingEvent.Type>(event: K, listener: TypedEventListener<PingEvent.Type>) {
    this.registered.delete(event);
    this.emitter.off(event, listener);
  }
}
