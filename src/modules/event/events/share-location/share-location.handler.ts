import { getUnixTime } from 'date-fns';

import { ConnectionID } from '../../connections';
import { EventHandler } from '../event.handler';

import { ShareLocationEvent } from './share-location.interface';

export class ShareLocationHandler extends EventHandler<ShareLocationEvent> {
  async connect(id: ConnectionID): Promise<ShareLocationEvent.Response> {
    if (!this.context?.prisma) throw new Error('PrismaService not found');

    await this.connection.setConnection(id);

    return { message: `Connected to ${id}` };
  }

  async handle(id: ConnectionID, data: ShareLocationEvent.Data): Promise<ShareLocationEvent.Response> {
    await this.connection.setConnection(id);

    await this.emitter.emit('share', id, {
      from: data.param.uid,
      timestamp: getUnixTime(new Date()),
      data: data.body,
    });

    return { message: 'location shared' };
  }
}
