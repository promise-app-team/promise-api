import { getUnixTime } from 'date-fns';

import { PingEvent } from '../ping.dto';

import { Strategy } from './strategy';

import { ConnectionID } from '@/modules/event/connections';

export class CommonStrategy extends Strategy<never> {
  async post<T>(id: ConnectionID, data: PingEvent.Payload<never, T>['data']) {
    const response: PingEvent.Response = { from: id, timestamp: getUnixTime(Date.now()), data: data.body };
    this.emitter.emit('send', id, response);
  }
}
