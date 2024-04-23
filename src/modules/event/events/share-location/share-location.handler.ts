import { getUnixTime } from 'date-fns';

import { ConnectionID } from '../../connections';
import { EventResponse } from '../event.dto';
import { EventHandler } from '../event.handler';

import { ShareLocationEvent } from './share-location.dto';

export class ShareLocationHandler extends EventHandler<ShareLocationEvent.Type> {
  async handle(id: ConnectionID, data: ShareLocationEvent.Data): Promise<EventResponse> {
    await this.connection.setConnection(id);

    await this.emitter.emit('share', id, {
      from: id,
      timestamp: getUnixTime(Date.now()),
      data: data.body,
    });

    return { message: 'location shared' };
  }
}
