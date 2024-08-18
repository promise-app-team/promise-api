import { Logger } from '@nestjs/common';
import { fromUnixTime, getUnixTime, isPast } from 'date-fns';
import * as R from 'remeda';

import type {
  Connection,
  ConnectionID,
  ConnectionCache,
  ConnectionEvent,
  ConnectionStage,
  ConnectionChannel,
  ConnectionMap,
  ConnectionPool,
  ConnectionChannelMap,
} from './connection.interface';

export class ConnectionManager {
  private static readonly pool: ConnectionPool = new Map();
  private static readonly instances = new Map<ConnectionEvent, ConnectionManager>();

  private static delConnectionPromise: Promise<void> | null = null;
  private static readonly reservedDelConnections = new Set<ConnectionID>();

  static forEvent(event: ConnectionEvent, stage: ConnectionStage, opts: { cache: ConnectionCache }): ConnectionManager {
    let instance = ConnectionManager.instances.get(event);
    if (!instance) {
      instance = new ConnectionManager(event, stage, opts.cache);
      ConnectionManager.instances.set(event, instance);
    }
    return instance;
  }

  private readonly channelMap: ConnectionChannelMap;
  private readonly loadConnectionPromiseMap: Map<ConnectionChannel, Promise<ConnectionMap>> = new Map();

  private constructor(
    private readonly event: ConnectionEvent,
    private readonly stage: ConnectionStage,
    private readonly cache: ConnectionCache
  ) {
    this.channelMap = new Map();
    ConnectionManager.pool.set(event, this.channelMap);
  }

  private makeCacheKey(channel: ConnectionChannel) {
    return `connection:[${JSON.stringify({ event: this.event, channel, stage: this.stage })}]`;
  }

  private async loadConnectionMap(channel: ConnectionChannel): Promise<ConnectionMap> {
    if (this.channelMap.has(channel)) {
      // this.debug(this.loadConnectionMap, `ConnectionMap already loaded (channel: ${channel})`);
      return this.channelMap.get(channel)!;
    }

    if (this.loadConnectionPromiseMap.has(channel)) {
      this.debug(this.loadConnectionMap, `Loading ConnectionMap in progress (channel: ${channel})`);
      return this.loadConnectionPromiseMap.get(channel)!;
    }

    this.debug(this.loadConnectionMap, `ConnectionMap not found (channel: ${channel})`);
    const promise = this._loadConnectionMap(channel);
    this.loadConnectionPromiseMap.set(channel, promise);
    promise.finally(() => this.loadConnectionPromiseMap.delete(channel));

    return promise;
  }

  private async _loadConnectionMap(channel: ConnectionChannel): Promise<ConnectionMap> {
    const connectionMap = this.channelMap.get(channel);
    if (connectionMap) return connectionMap;

    this.debug(this._loadConnectionMap, `Trying to load ConnectionMap (channel: ${channel})`);

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

    if (filteredConnectionMap.size === 0) {
      this.debug(this._loadConnectionMap, `Empty ConnectionMap loaded (channel: ${channel})`);
    } else {
      const size = filteredConnectionMap.size;
      this.debug(this._loadConnectionMap, `ConnectionMap loaded (${size} connections) (channel: ${channel})`);
    }

    return filteredConnectionMap;
  }

  async getConnection(cid: ConnectionID, channel: ConnectionChannel): Promise<Connection | null> {
    this.debug(this.getConnection, `Trying to get connection (channel: ${channel}): ${cid}`);

    if (ConnectionManager.reservedDelConnections.has(cid)) {
      this.debug(this.getConnection, `Connection is reserved for deletion: ${cid}`);
      return null;
    }

    const connectionMap = await this.loadConnectionMap(channel);
    const connection = connectionMap.get(cid) ?? null;

    connection
      ? this.debug(this.getConnection, `Connection found (${channel}): ${JSON.stringify(connection)}`)
      : this.debug(this.getConnection, `Connection not found (${channel}): ${cid}`);

    return connection;
  }

  async getConnections(channel: ConnectionChannel): Promise<Connection[]> {
    this.debug(this.getConnections, `Trying to get connections (channel: ${channel})`);

    const connectionMap = await this.loadConnectionMap(channel);
    const connections = Array.from(connectionMap.values() ?? []);

    connections.length > 0
      ? this.debug(this.getConnections, `Connections found (${channel}): ${connections}`)
      : this.debug(this.getConnections, `Connections not found (${channel})`);

    return connections.filter((c) => !ConnectionManager.reservedDelConnections.has(c.cid));
  }

  async setConnection(
    connection: Pick<Connection, 'cid' | 'uid'>,
    channel: ConnectionChannel,
    opts?: { ttl?: number }
  ): Promise<boolean> {
    const { cid, uid } = connection;
    this.debug(this.setConnection, `[${this.event}.${channel}] Trying to set connection: ${cid}`);

    const key = this.makeCacheKey(channel);
    const exists = await this.exists(cid, channel);
    if (exists) return false;

    const iat = getUnixTime(new Date());
    const ttl = opts?.ttl ?? 60 * 60 * 24;
    const newConnection: Connection = { cid, uid, iat, exp: iat + ttl };
    const connectionMap = await this.loadConnectionMap(channel);
    connectionMap.set(cid, newConnection);

    await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    this.debug(this.setConnection, `Connection set (channel: ${channel}): ${JSON.stringify(newConnection)}`);

    return true;
  }

  async delConnection(cid: ConnectionID, channel: ConnectionChannel): Promise<boolean> {
    this.debug(this.delConnection, `Trying to delete connection (channel: ${channel}): ${cid}`);

    const connectionMap = await this.loadConnectionMap(channel);
    connectionMap.delete(cid);

    const key = this.makeCacheKey(channel);
    if (connectionMap.size > 0) {
      await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    } else {
      this.channelMap.delete(channel);
      await this.cache.del(key);
    }

    this.debug(this.delConnection, `Connection deleted (${key}): ${cid}`);

    return true;
  }

  async delConnections(ids: ConnectionID[], channel: ConnectionChannel = 'default'): Promise<boolean> {
    this.debug(this.delConnections, `Trying to delete connections (channel: ${channel}): ${ids}`);

    const connectionMap = await this.loadConnectionMap(channel);
    ids.forEach((id) => connectionMap.delete(id));

    const key = this.makeCacheKey(channel);
    if (connectionMap.size > 0) {
      await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    } else {
      this.channelMap.delete(channel);
      await this.cache.del(key);
    }

    this.debug(this.delConnections, `Connections deleted (${key}): ${ids}`);

    return true;
  }

  static async delConnection(cid: ConnectionID): Promise<void> {
    this.debug(this.delConnection, `Trying to delete connection: ${cid}`);

    this.reservedDelConnections.add(cid);

    if (!this.delConnectionPromise) {
      this.delConnectionPromise = new Promise((resolve) => {
        setTimeout(() => this.delConnections().then(resolve), 300);
      });
    }

    await this.delConnectionPromise;
    this.delConnectionPromise = null;

    if (this.reservedDelConnections.has(cid)) {
      await this.delConnection(cid);
    }
  }

  static async delConnections() {
    if (this.reservedDelConnections.size === 0) return;

    this.debug(
      this.delConnections,
      `Trying to delete reserved connections: ${Array.from(this.reservedDelConnections)}`
    );

    const reservedDelConnections = Array.from(this.reservedDelConnections);
    for (const [eventName, channelMap] of this.pool.entries()) {
      for (const [channelName, connectionMap] of channelMap.entries()) {
        for (const id of reservedDelConnections) {
          const connection = connectionMap.get(id);
          if (!connection) continue;

          const instance = this.instances.get(eventName);
          if (!instance) continue;

          connectionMap.delete(id);
          this.reservedDelConnections.delete(id);
          const key = instance.makeCacheKey(channelName);
          if (connectionMap.size > 0) {
            await instance.cache.set(key, Array.from(connectionMap.values() ?? []));
          } else {
            instance.channelMap.delete(channelName);
            await instance.cache.del(key);
          }

          instance.debug(this.delConnections, `Connection deleted (${key}): ${id}`);
        }
      }
    }

    this.debug(this.delConnections, `Reserved connections deleted`);
  }

  async exists(cid: ConnectionID, channel: ConnectionChannel): Promise<boolean> {
    const connectionMap = await this.loadConnectionMap(channel);
    const exists = !!connectionMap.get(cid);
    this.debug(this.exists, `Connection ${exists ? 'exists' : 'not exists'}: ${cid} (channel: ${channel})`);
    return exists;
  }

  expired(connection: Connection): boolean {
    const expired = isPast(fromUnixTime(connection.exp));
    if (expired) this.debug(this.expired, `Connection expired: ${connection.cid}`);
    return expired;
  }

  private readonly debug = ConnectionManager.debug;
  private static debug(message: any): void;
  private static debug(fn: Function, message: any): void;
  private static debug(...args: any[]): void {
    if (args.length === 2) {
      const [fn, message] = args;
      Logger.debug(`[${ConnectionManager.name}.${fn.name}] ${message}`, ConnectionManager.name);
    } else {
      Logger.debug(args[0], ConnectionManager.name);
    }
  }
}
