import { Injectable } from '@nestjs/common';
import * as R from 'remeda';

import { Connection } from './event.dto';

import { TypedConfigService } from '@/config/env';
import { CacheService } from '@/customs/cache';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly config: TypedConfigService,
    private readonly cache: CacheService
  ) {}

  private readonly connections: Connection[] = [];

  private get key() {
    return `event:connections:${this.config.get('stage')}`;
  }

  async init() {
    const connections = await this.cache.get<Connection[]>(this.key);
    this.connections.push(...(connections ?? []));
    R.uniqueBy(this.connections, (c) => c.id);
  }

  async getConnection(id: string) {
    return this.connections.find((c) => c.id === id) ?? null;
  }

  async getConnections() {
    return this.connections;
  }

  async setConnection(connection: Connection): Promise<boolean> {
    if (this.connections.some((c) => c.id === connection.id)) return false;
    this.connections.push(connection);
    await this.cache.set(this.key, this.connections);
    return true;
  }

  async delConnection(id: string): Promise<boolean> {
    const connectionIndex = this.connections.findIndex((c) => c.id === id);
    if (connectionIndex === -1) return false;
    this.connections.splice(connectionIndex, 1);
    await this.cache.set(this.key, this.connections);
    return true;
  }
}
