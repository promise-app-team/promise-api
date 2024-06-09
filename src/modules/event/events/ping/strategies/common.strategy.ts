import { getUnixTime } from 'date-fns';

import { Strategy } from './strategy';

import type { PingEvent } from '../ping.interface';
import type { ConnectionID } from '@/modules/event/connections';

export class CommonStrategy extends Strategy<never> {
  async post<T>(cid: ConnectionID, data: PingEvent.Payload<never, T>['data']) {
    await this.emitter.emit('send', cid, {
      from: cid,
      timestamp: getUnixTime(Date.now()),
      data: data.body,
    });
  }
}
