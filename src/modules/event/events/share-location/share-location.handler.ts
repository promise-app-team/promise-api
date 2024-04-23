import { getUnixTime } from 'date-fns';

import { ConnectionID } from '../../connections';
import { EventHandler } from '../event.handler';

import { ShareLocationEvent } from './share-location.interface';

import { PromiseStatus, PromiseUserRole } from '@/modules/promise';
import { makePromiseFilter } from '@/modules/promise/promise.utils';

export class ShareLocationHandler extends EventHandler<ShareLocationEvent> {
  private channel = (pid: number | string) => `promise_${pid}`;

  async connect(id: ConnectionID, extra?: Record<string, any>): Promise<ShareLocationEvent.Response> {
    if (!extra?.['userId']) throw new Error('User needs to be authenticated');
    if (!this.context?.prisma) throw new Error('PrismaService not found');

    const promises = await this.context.prisma.promise.findMany({
      where: makePromiseFilter({
        userId: +extra.userId,
        role: PromiseUserRole.ALL,
        status: PromiseStatus.AVAILABLE,
      }),
    });

    if (promises.length > 0) {
      await Promise.all(promises.map((p) => this.connection.setConnection(id, this.channel(p.id))));
    } else {
      throw new Error('참여 중인 약속이 없습니다.');
    }

    return { message: `Connected to ${id}` };
  }

  async handle(id: ConnectionID, data: ShareLocationEvent.Data): Promise<ShareLocationEvent.Response> {
    await Promise.all(
      data.param.promiseIds.map(async (pid) => {
        const channel = this.channel(pid);
        await this.connection.setConnection(id, channel);
        const connections = await this.connection.getConnections(channel);
        return Promise.all(
          connections
            .filter((to) => to.id !== id)
            .map((to) =>
              this.emitter.emit('share', to.id, {
                from: data.param.id,
                timestamp: getUnixTime(new Date()),
                data: data.body,
              })
            )
        );
      })
    );

    return { message: 'location shared' };
  }
}
