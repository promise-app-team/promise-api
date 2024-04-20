import { PingEvent } from '../ping.dto';

export interface Strategy<S extends PingEvent.Strategy = PingEvent.Strategy> {
  post<T>(id: string, data: PingEvent.Payload<S, T>['data']): Promise<void>;
}
