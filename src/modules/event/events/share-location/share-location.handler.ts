import { getUnixTime } from 'date-fns';

import { PromiseStatus, PromiseUserRole } from '@/modules/promise';
import { makePromiseFilter } from '@/modules/promise/promise.utils';

import { EventHandler } from '../event.handler';

import type { ShareLocationEvent } from './share-location.interface';
import type { Connection, ConnectionID, ConnectionUID } from '../../connections';

export class ShareLocationHandler extends EventHandler<ShareLocationEvent> {
  private channel = (pid: number | string) => `promise_${pid}`;

  async connect(connection: Pick<Connection, 'cid' | 'uid'>): Promise<ShareLocationEvent.Response> {
    if (!this.context?.prisma) throw new Error('PrismaService not found');

    const promises = await this.context.prisma.promise.findMany({
      where: makePromiseFilter({
        userId: connection.uid,
        role: PromiseUserRole.ALL,
        status: PromiseStatus.AVAILABLE,
      }),
    });

    if (promises.length > 0) {
      await Promise.all(promises.map((p) => this.connectionManager.setConnection(connection, this.channel(p.id))));
    } else {
      throw new Error('참여 중인 약속이 없습니다.');
    }

    return { message: `Connected to ${connection.cid}` };
  }

  async handle(cid: ConnectionID, data: ShareLocationEvent.Data): Promise<ShareLocationEvent.Response> {
    const message = (uid: ConnectionUID, data: any) => ({ from: uid, timestamp: getUnixTime(new Date()), data });

    if (!data.param.__promiseIds?.length) {
      const error = '약속을 찾을 수 없습니다';
      await this.eventEmitter.emit('error', cid, message(0, { error }));
      return { message: error };
    }

    await Promise.all(
      data.param.__promiseIds!.map(async (pid, i) => {
        const channel = this.channel(pid);
        const connection = await this.connectionManager.getConnection(cid, channel);
        if (!connection) {
          const error = `연결된 약속을 찾을 수 없습니다 (pid: ${data.param.promiseIds[i]})`;
          await this.eventEmitter.emit('error', cid, message(0, { error }));
          return { message: error };
        }

        const connections = await this.connectionManager.getConnections(channel);
        const loc = { lat: data.body.lat, lng: data.body.lng };
        return Promise.all(
          connections
            .filter((to) => to.cid !== cid)
            .map((to) => this.eventEmitter.emit('share', to.cid, message(connection.uid, loc)))
        );
      })
    );

    return { message: 'location shared' };
  }
}
