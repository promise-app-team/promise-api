import type { PingEvent } from '../ping.interface';
import type { ConnectionID, ConnectionManager } from '@/modules/event/connections';
import type { TypedEventEmitter } from '@/utils';

export abstract class Strategy<S extends PingEvent.Strategy = PingEvent.Strategy> {
  constructor(
    protected connection: ConnectionManager,
    protected emitter: TypedEventEmitter<PingEvent.Type>
  ) {}

  abstract post<T>(cid: ConnectionID, data: PingEvent.Payload<S, T>['data']): Promise<void>;
}
