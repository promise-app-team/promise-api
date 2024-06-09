import { getUnixTime } from 'date-fns';

import { PromiseStatus, PromiseUserRole } from '@/modules/promise';
import { makePromiseFilter } from '@/modules/promise/promise.utils';

import { EventHandler } from '../event.handler';

import type { ShareLocationEvent } from './share-location.interface';
import type { Connection, ConnectionID } from '../../connections';

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
      await Promise.all(promises.map((p) => this.connection.setConnection(connection, this.channel(p.id))));
    } else {
      throw new Error('참여 중인 약속이 없습니다.');
    }

    return { message: `Connected to ${connection.cid}` };
  }

  async handle(cid: ConnectionID, data: ShareLocationEvent.Data): Promise<ShareLocationEvent.Response> {
    const timestamp = getUnixTime(new Date());
    await Promise.all(
      data.param._promiseIds.map(async (pid, i) => {
        const channel = this.channel(pid);
        const connection = await this.connection.getConnection(cid, channel);
        if (!connection) {
          const error = `연결된 약속을 찾을 수 없습니다 (pid: ${data.param.promiseIds[i]})`;
          await this.emitter.emit('error', cid, {
            from: 0,
            timestamp,
            data: { error },
          });
          return { message: error };
        }

        const connections = await this.connection.getConnections(channel);
        return Promise.all(
          connections
            .filter((to) => to.cid !== cid)
            .map((to) =>
              this.emitter.emit('share', to.cid, {
                from: connection.uid,
                timestamp,
                data: {
                  lat: data.body.lat,
                  lng: data.body.lng,
                },
              })
            )
        );
      })
    );

    return { message: 'location shared' };
  }
}
