import { ConnectionID, ConnectionScope } from '../../connections';
import { EventResponse } from '../event.dto';
import { EventHandler } from '../event.handler';

import { PingEvent } from './ping.dto';
import { Strategy, StrategyManager } from './strategies';

import { CacheService } from '@/customs/cache';

export class PingEventHandler extends EventHandler<PingEvent.Type> {
  private readonly strategy: StrategyManager;

  constructor(scope: ConnectionScope, cache: CacheService) {
    super(scope, cache);
    this.strategy = new StrategyManager(this.connection, this.emitter);
  }

  async handle(id: ConnectionID, data: PingEvent.Data): Promise<EventResponse> {
    await this.connection.setConnection(id);

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
}
