import { Injectable } from '@nestjs/common';
import { getUnixTime } from 'date-fns';
import * as R from 'remeda';

import { Connection } from './connection.dto';

import { TypedConfigService } from '@/config/env';
import { CacheService } from '@/customs/cache';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly config: TypedConfigService,
    private readonly cache: CacheService
  ) {}

  private scope: string = 'event';

  private connectionMap = new Map<string, Connection>();
  private get connections() {
    return [...this.connectionMap.values()];
  }

  private get key() {
    return `connection:${this.scope}:${this.config.get('stage')}`;
  }

  async init(scope?: string) {
    if (scope) this.scope = scope;
    const connections = await this.cache.get<Connection[]>(this.key);

    this.connectionMap = R.pipe(
      this.connections,
      R.concat(connections ?? []),
      R.filter(this.isExpired.bind(this)),
      R.uniqueBy(R.prop('id')),
      R.map((c) => [c.id, c] as const),
      (input) => new Map(input)
    );
  }

  async getConnection(id: string): Promise<Connection | null> {
    return this.connectionMap.get(id) ?? null;
  }

  async getConnections(): Promise<Connection[]> {
    return this.connectionMap.size ? this.connections : [];
  }

  async setConnection(connection: Pick<Connection, 'id'>, ttl = 60 * 60 * 24): Promise<boolean> {
    if (this.connectionMap.has(connection.id)) return false;
    const iat = getUnixTime(new Date());
    const newConnection = {
      ...connection,
      iat,
      exp: iat + ttl,
      ttl,
      scp: this.scope,
      stg: this.config.get('stage'),
    } satisfies Connection;
    this.connectionMap.set(connection.id, newConnection);
    const [key, value] = [this.key, this.connections];
    await this.cache.set(key, value);
    return true;
  }

  async delConnection(ids: string[]): Promise<void>;
  async delConnection(...ids: string[]): Promise<void>;
  async delConnection(...ids: (string | string[])[]): Promise<void> {
    R.pipe(
      ids,
      R.flatten(),
      R.filter(R.isIncludedIn(R.map(this.connections, R.prop('id')))),
      R.forEach(this.connectionMap.delete.bind(this.connectionMap))
    );
    await this.cache.set(this.key, this.connections);
  }

  isExpired(connection: Connection): boolean {
    return getUnixTime(new Date()) > connection.exp;
  }
}
