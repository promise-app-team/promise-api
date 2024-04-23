import { Injectable } from '@nestjs/common';

import { PingEventHandler } from './ping';
import { ShareLocationHandler } from './share-location';

import { TypedConfigService } from '@/config/env';
import { CacheService } from '@/customs/cache';
import { PrismaService } from '@/prisma';

export interface Events {
  ping: PingEventHandler;
  'share-location': ShareLocationHandler;
}

@Injectable()
export class EventManager {
  private readonly events: Events;

  constructor(
    private readonly config: TypedConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {
    const stage = this.config.get('stage');
    this.events = {
      ping: new PingEventHandler({ event: 'ping', stage }, this.cache),
      'share-location': new ShareLocationHandler({ event: 'share-location', stage }, this.cache, { prisma }),
    };
  }

  get<T extends keyof Events>(event: T): Events[T] {
    if (!event) throw new Error('Must provide an event name by query parameter');
    if (!this.events[event]) throw new Error(`Event '${event}' not found`);
    return this.events[event];
  }
}
