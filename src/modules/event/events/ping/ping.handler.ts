import { getUnixTime } from 'date-fns'

import { EventHandler } from '../event.handler'

import { StrategyManager } from './strategies'

import type { PingEvent } from './ping.interface'
import type { Strategy } from './strategies'
import type { ConnectionID, ConnectionScope } from '../../connections'
import type { CacheService } from '@/customs/cache'

export class PingEventHandler extends EventHandler<PingEvent> {
  private readonly strategy: StrategyManager

  constructor(scope: ConnectionScope, cache: CacheService) {
    super(scope, cache)
    this.strategy = new StrategyManager(this.connectionManager, this.eventEmitter)
  }

  async handle(cid: ConnectionID, data: PingEvent.Data): Promise<PingEvent.Response> {
    const message = (cid: ConnectionID, data: any) => ({ from: cid, timestamp: getUnixTime(new Date()), data })

    const strategy = data.param?.strategy
    if (!strategy) {
      const error = `Strategy not found`
      await this.eventEmitter.emit('error', cid, message(cid, { error }))
      return { message: error }
    }

    const handler: Strategy = this.strategy.get(strategy)
    if (!handler) {
      const error = `Strategy '${strategy}' not found`
      await this.eventEmitter.emit('error', cid, message(cid, { error }))
      return { message: error }
    }

    await handler.post(cid, data)

    return { message: 'pong' }
  }
}
