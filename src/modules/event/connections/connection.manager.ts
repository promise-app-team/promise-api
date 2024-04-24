import { getUnixTime } from 'date-fns';
import * as R from 'remeda';

import {
  Connection,
  ConnectionID,
  ConnectionCache,
  ConnectionScope,
  ConnectionEvent,
  ConnectionStage,
  ConnectionChannel,
  ConnectionMap,
  ConnectionEventMap,
  ConnectionChannelMap,
} from './connection.interface';

export class ConnectionManager {
  private readonly channelMap: ConnectionChannelMap;

  private static pool: ConnectionEventMap = new Map();
  private static instances = new Map<ConnectionEvent, ConnectionManager>();

  private constructor(
    private readonly event: ConnectionScope['event'],
    private readonly stage: ConnectionScope['stage'],
    private readonly cache: ConnectionCache
  ) {
    this.channelMap = new Map();
    ConnectionManager.pool.set(event, this.channelMap);
  }

  static forEvent(event: ConnectionEvent, stage: ConnectionStage, opts: { cache: ConnectionCache }): ConnectionManager {
    let instance = ConnectionManager.instances.get(event);
    if (!instance) {
      instance = new ConnectionManager(event, stage, opts.cache);
      ConnectionManager.instances.set(event, instance);
    }
    return instance;
  }

  private makeCacheKey(channel: ConnectionChannel) {
    const { event, stage } = this;
    const scope: ConnectionScope = { event, channel, stage };
    return `connection:[${JSON.stringify(scope)}]`;
  }

  private loadConnectionPromiseMap: Map<ConnectionChannel, Promise<ConnectionMap>> = new Map();
  private async loadConnectionMap(channel: ConnectionChannel): Promise<ConnectionMap> {
    if (this.loadConnectionPromiseMap.has(channel)) {
      this.debug(this.loadConnectionMap, `Loading connection map (${channel}) is already in progress`);
      return this.loadConnectionPromiseMap.get(channel)!;
    }

    const promise = this._loadConnectionMap(channel);
    this.loadConnectionPromiseMap.set(channel, promise);

    promise.finally(() => {
      this.loadConnectionPromiseMap.delete(channel);
    });

    return promise;
  }

  private async _loadConnectionMap(channel: ConnectionChannel): Promise<ConnectionMap> {
    const connectionMap = this.channelMap.get(channel);
    if (connectionMap) return connectionMap;

    this.debug(this.loadConnectionMap, `Loading connection map (${channel})`);

    const key = this.makeCacheKey(channel);
    const loadedConnections = await this.cache.get<Connection[]>(key);

    const filteredConnectionMap: ConnectionMap = R.pipe(
      loadedConnections ?? [],
      R.filter(this.expired.bind(this)),
      R.uniqueBy(R.prop('cid')),
      R.map((c) => [c.cid, c] as const),
      (input) => new Map(input)
    );
    this.channelMap.set(channel, filteredConnectionMap);
    this.debug(this.loadConnectionMap, `Loaded connection map (${key}): %o`, filteredConnectionMap);

    return filteredConnectionMap;
  }

  async getConnection(cid: ConnectionID, channel: ConnectionChannel): Promise<Connection | null> {
    const connectionMap = await this.loadConnectionMap(channel);

    this.debug(this.getConnection, `Getting connection (${channel}): %o`, cid);

    const connection = connectionMap.get(cid) ?? null;

    connection
      ? this.debug(this.getConnection, `Connection found (${channel}): %o`, connection)
      : this.debug(this.getConnection, `Connection not found (${channel}): %s`, cid);

    return connection;
  }

  async getConnections(channel: ConnectionChannel): Promise<Connection[]> {
    const connectionMap = await this.loadConnectionMap(channel);

    this.debug(this.getConnections, `Getting connections (${channel})`);

    const connections = Array.from(connectionMap.values() ?? []);

    connections.length > 0
      ? this.debug(this.getConnections, `Connections found (${channel}): %o`, connections)
      : this.debug(this.getConnections, `Connections not found (${channel})`);

    return connections;
  }

  async setConnection(
    connection: Pick<Connection, 'cid' | 'uid'>,
    channel: ConnectionChannel,
    opts?: { ttl?: number }
  ): Promise<boolean> {
    const key = this.makeCacheKey(channel);
    const { cid, uid } = connection;
    const exists = await this.exists(connection.cid, channel);
    if (exists) return false;

    this.debug(this.setConnection, `Setting connection (${channel}): %o`, JSON.stringify({ cid, uid }));

    const iat = getUnixTime(new Date());
    const ttl = opts?.ttl ?? 60 * 60 * 24;
    const newConnection: Connection = { cid, uid, iat, exp: iat + ttl };
    const connectionMap = await this.loadConnectionMap(channel);
    connectionMap.set(cid, newConnection);

    await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    this.debug(this.setConnection, `Connection set (${channel}): %o`, newConnection);

    this.debug(this.setConnection, `Current connection pool: %o`, ConnectionManager.pool);

    return true;
  }

  async delConnection(cid: ConnectionID, channel: ConnectionChannel): Promise<boolean> {
    const connectionMap = await this.loadConnectionMap(channel);

    this.debug(this.delConnection, `Deleting connection (${channel}): %s`, cid);

    connectionMap.delete(cid);
    const key = this.makeCacheKey(channel);
    if (connectionMap.size > 0) {
      await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    } else {
      this.channelMap.delete(channel);
      await this.cache.del(key);
    }

    this.debug(this.delConnection, `Connection deleted (${key}): %s`, cid);

    this.debug(this.delConnection, `Current connection pool: %o`, ConnectionManager.pool);

    return true;
  }

  async delConnections(ids: ConnectionID[], channel: ConnectionChannel = 'default'): Promise<boolean> {
    const connectionMap = await this.loadConnectionMap(channel);

    this.debug(this.delConnections, `Deleting connections (${channel}): %o`, ids);

    ids.forEach((id) => connectionMap.delete(id));
    const key = this.makeCacheKey(channel);
    if (connectionMap.size > 0) {
      await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    } else {
      this.channelMap.delete(channel);
      await this.cache.del(key);
    }

    this.debug(this.delConnections, `Connections deleted (${key}): %o`, ids);

    return true;
  }

  private static reservedDelConnections = new Set<ConnectionID>();

  static async delConnection(cid: ConnectionID): Promise<void> {
    this.reservedDelConnections.add(cid);
    await new Promise((resolve) => setTimeout(() => this.delConnections().then(resolve), 300));
  }

  static async delConnections() {
    if (this.reservedDelConnections.size === 0) return;
    const reservedDelConnections = Array.from(this.reservedDelConnections.values());

    for (const [eventName, channelMap] of this.pool.entries()) {
      for (const [channelName, connectionMap] of channelMap.entries()) {
        for (const id of reservedDelConnections) {
          const connection = connectionMap.get(id);
          if (!connection) continue;

          const instance = this.instances.get(eventName);
          if (!instance) continue;

          connectionMap.delete(id);
          const key = instance.makeCacheKey(channelName);
          if (connectionMap.size > 0) {
            await instance.cache.set(key, Array.from(connectionMap.values() ?? []));
          } else {
            instance.channelMap.delete(channelName);
            await instance.cache.del(key);
          }

          instance.debug(this.delConnections, `Connection deleted (${key}): %s`, id);
        }
      }
    }

    this.reservedDelConnections.clear();
  }

  async exists(cid: ConnectionID, channel: ConnectionChannel): Promise<boolean> {
    this.debug(this.exists, `Checking connection exists: %s`, cid);
    const connectionMap = await this.loadConnectionMap(channel);
    const connection = connectionMap.get(cid);
    this.debug(this.exists, `Connection ${connection ? 'exists' : 'not exists'}: %s`, cid);
    return !!connection;
  }

  expired(connection: Connection): boolean {
    const now = getUnixTime(new Date());
    const expired = connection.exp < now;
    if (expired) this.debug(this.expired, `Connection expired: %o`, connection);
    return !expired;
  }

  private debug(fn: Function, message: string, ...args: any[]) {
    console.log(`[${ConnectionManager.name}.${fn.name}] ${message}`, ...args);
  }
}
