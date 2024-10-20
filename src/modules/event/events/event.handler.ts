import { AsyncEventEmitter } from '@/utils'

import { ConnectionManager } from '../connections'

import type { Connection, ConnectionID, ConnectionScope } from '../connections'
import type { AbstractEvent } from './event.interface'
import type { CacheService } from '@/customs/cache'
import type { AsyncEventListener } from '@/utils'

export abstract class EventHandler<TEvent extends AbstractEvent> {
  protected readonly connectionManager: ConnectionManager
  protected readonly eventEmitter = new AsyncEventEmitter<TEvent['Type']>()
  protected readonly context?: TEvent['Context']

  constructor(scope: ConnectionScope, cache: CacheService, context?: TEvent['Context']) {
    this.connectionManager = ConnectionManager.forEvent(scope.event, scope.stage, { cache })
    this.context = context
  }

  async connect(connection: Pick<Connection, 'cid' | 'uid'>, channel = 'public'): Promise<TEvent['Response']> {
    const success = await this.connectionManager.setConnection(connection, channel)
    if (!success) throw new Error(`Failed to connect to ${connection.cid} (${connection.uid})`)
    return { message: `Connected to ${connection.cid}` }
  }

  static async disconnect(cid: ConnectionID): Promise<AbstractEvent.Response> {
    await ConnectionManager.delConnection(cid)
    return { message: `Disconnected from ${cid}` }
  }

  abstract handle(
    cid: ConnectionID,
    data: AbstractEvent.Data,
    payload?: Record<string, any>
  ): Promise<TEvent['Response']>

  private registered = new Set()

  async on<K extends keyof TEvent['Type']>(event: K, listener: AsyncEventListener<K, TEvent['Type']>) {
    if (this.registered.has(event)) return
    this.registered.add(event)
    this.eventEmitter.on(event as any, listener)
  }
}
