import { getUnixTime } from 'date-fns';

import { PingEvent } from '../ping.interface';

import { Strategy } from './strategy';

import { ConnectionID } from '@/modules/event/connections';

export class SpecificStrategy extends Strategy<PingEvent.Strategy.Specific> {
  async post(cid: ConnectionID, data: PingEvent.Payload<PingEvent.Strategy.Specific>['data']) {
    const response = (data: PingEvent.Payload<PingEvent.Strategy.Specific>['data']) =>
      ({ from: cid, timestamp: getUnixTime(Date.now()), data: data.body }) satisfies PingEvent.Message;

    if (!data.param?.to) {
      const error = `Strategy 'specific' requires a 'to' parameter`;
      return this.emitter.emit('send', cid, response({ body: { error } }));
    }

    const to = await this.connection.getConnection(data.param.to, 'default');
    if (to) {
      await this.emitter.emit('send', to.cid, response(data));
    } else {
      const error = `Connection '${data.param.to}' not found`;
      await this.emitter.emit('send', cid, response({ body: { error } }));
    }
  }
}
