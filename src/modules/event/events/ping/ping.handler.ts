import { ConnectionID, ConnectionScope } from '../../connections';
import { EventHandler } from '../event.handler';

import { PingEvent } from './ping.interface';
import { Strategy, StrategyManager } from './strategies';

import { CacheService } from '@/customs/cache';

export class PingEventHandler extends EventHandler<PingEvent> {
  private readonly strategy: StrategyManager;

  constructor(scope: ConnectionScope, cache: CacheService) {
    super(scope, cache);
    this.strategy = new StrategyManager(this.connection, this.emitter);
  }

  async handle(cid: ConnectionID, data: PingEvent.Data): Promise<PingEvent.Response> {
    const exists = await this.connection.exists(cid, 'default');
    if (!exists) {
      const error = `Connection not found: ${cid}`;
      await this.emitter.emit('error', cid, error);
      return { message: error };
    }

    const strategy = data.param?.strategy;
    if (!strategy) {
      const error = `Strategy not found`;
      await this.strategy.get('common').post(cid, { body: { error } });
      return { message: error };
    }

    const handler: Strategy = this.strategy.get(strategy);
    if (!handler) {
      const error = `Strategy '${strategy}' not found`;
      await this.strategy.get('common').post(cid, { body: { error } });
      return { message: error };
    }

    await handler.post(cid, data);

    return { message: 'pong' };
  }
}
