import { PingEvent } from '../ping.dto';

import { BroadcastStrategy } from './broadcast.strategy';
import { CommonStrategy } from './common.strategy';
import { SelfStrategy } from './self.strategy';
import { SpecificStrategy } from './specific.strategy';

import { ConnectionService } from '@/modules/event/connection';
import { TypedEventEmitter } from '@/utils';

interface StrategyMap {
  [PingEvent.Strategy.Self]: SelfStrategy;
  [PingEvent.Strategy.Specific]: SpecificStrategy;
  [PingEvent.Strategy.Broadcast]: BroadcastStrategy;
  common: CommonStrategy;
}

export class StrategyManager {
  private readonly strategies: StrategyMap;

  constructor(
    private readonly connection: ConnectionService,
    private readonly emitter: TypedEventEmitter<PingEvent.Type>
  ) {
    this.connection.init('ping');
    this.strategies = {
      [PingEvent.Strategy.Self]: new SelfStrategy(this.connection, this.emitter),
      [PingEvent.Strategy.Specific]: new SpecificStrategy(this.connection, this.emitter),
      [PingEvent.Strategy.Broadcast]: new BroadcastStrategy(this.connection, this.emitter),
      common: new CommonStrategy(this.connection, this.emitter),
    };
  }

  get<K extends keyof StrategyMap>(strategy: K): StrategyMap[K] {
    return this.strategies[strategy];
  }
}
