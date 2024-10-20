import { PingEvent } from '../ping.interface'

import { BroadcastStrategy } from './broadcast.strategy'
import { SelfStrategy } from './self.strategy'
import { SpecificStrategy } from './specific.strategy'

import type { ConnectionManager } from '@/modules/event/connections'
import type { AsyncEventEmitter } from '@/utils'

interface StrategyMap {
  [PingEvent.Strategy.Self]: SelfStrategy
  [PingEvent.Strategy.Specific]: SpecificStrategy
  [PingEvent.Strategy.Broadcast]: BroadcastStrategy
}

export class StrategyManager {
  private readonly strategies: StrategyMap

  constructor(
    private readonly connection: ConnectionManager,
    private readonly emitter: AsyncEventEmitter<PingEvent.Type>,
  ) {
    this.strategies = {
      [PingEvent.Strategy.Self]: new SelfStrategy(this.connection, this.emitter),
      [PingEvent.Strategy.Specific]: new SpecificStrategy(this.connection, this.emitter),
      [PingEvent.Strategy.Broadcast]: new BroadcastStrategy(this.connection, this.emitter),
    }
  }

  get<K extends keyof StrategyMap>(strategy: K): StrategyMap[K] {
    return this.strategies[strategy]
  }
}
