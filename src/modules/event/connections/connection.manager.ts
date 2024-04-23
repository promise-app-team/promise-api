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

  private constructor(
    private readonly event: ConnectionScope['event'],
    private readonly stage: ConnectionScope['stage'],
    private readonly cache: ConnectionCache
  ) {
    this.channelMap = new Map();
    ConnectionManager.pool.set(event, this.channelMap);
  }

  private static pool: ConnectionEventMap = new Map();
  private static instances = new Map<ConnectionEvent, ConnectionManager>();

  static forEvent(event: ConnectionEvent, stage: ConnectionStage, opts: { cache: ConnectionCache }): ConnectionManager {
    let instance = ConnectionManager.instances.get(event);
    if (!instance) {
      instance = new ConnectionManager(event, stage, opts.cache);
      ConnectionManager.instances.set(event, instance);
    }
    return instance;
  }

  private makeCacheKey(channel: ConnectionChannel = 'default') {
    const { event, stage } = this;
    const scope: ConnectionScope = { event, channel, stage };
    return `connection:[${JSON.stringify(scope)}]`;
  }

  private async loadConnections(channel: ConnectionChannel = 'default') {
    const connections = this.channelMap.get(channel) ?? new Map();
    if (connections.size > 0) return;

    const key = this.makeCacheKey(channel);
    const loadedConnections = await this.cache.get<Connection[]>(key);
    const filteredConnectionMap: ConnectionMap = R.pipe(
      loadedConnections ?? [],
      R.filter(this.isExpired.bind(this)),
      R.uniqueBy(R.prop('id')),
      R.map((c) => [c.id, c] as const),
      (input) => new Map(input)
    );
    this.channelMap.set(channel, filteredConnectionMap);

    this.debug(this.loadConnections, `Loaded Connections (${key}): %o`, filteredConnectionMap);

    this.debug(this.loadConnections, `Current connection pool: %o`, ConnectionManager.pool);
  }

  async getConnection(id: ConnectionID, channel: ConnectionChannel = 'default'): Promise<Connection | null> {
    await this.loadConnections(channel);

    this.debug(this.getConnection, `Getting connection (${channel}): %o`, id);

    const connection = this.channelMap.get(channel)?.get(id) ?? null;

    connection
      ? this.debug(this.getConnection, `Connection found (${channel}): %o`, connection)
      : this.debug(this.getConnection, `Connection not found (${channel}): %s`, id);

    return connection;
  }

  async getConnections(channel: ConnectionChannel = 'default'): Promise<Connection[]> {
    await this.loadConnections(channel);

    this.debug(this.getConnections, `Getting connections (${channel})`);

    const connections = Array.from(this.channelMap.get(channel)?.values() ?? []);

    connections.length > 0
      ? this.debug(this.getConnections, `Connections found (${channel}): %o`, connections)
      : this.debug(this.getConnections, `Connections not found (${channel})`);

    return connections;
  }

  async setConnection(
    id: ConnectionID,
    channel: ConnectionChannel = 'default',
    opts?: { ttl?: number }
  ): Promise<boolean> {
    const key = this.makeCacheKey(channel);
    const connection = await this.getConnection(id, channel);
    if (connection) return false;

    this.debug(this.setConnection, `Setting connection (${channel}): %o`, id);

    const connectionMap = this.channelMap.get(channel);
    if (!connectionMap) {
      this.debug(this.setConnection, `Connection map not found (${channel})`);
      return false;
    }

    const iat = getUnixTime(new Date());
    const ttl = opts?.ttl ?? 60 * 60 * 24;
    const newConnection: Connection = { id, iat, exp: iat + ttl };
    connectionMap.set(id, newConnection);

    await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    this.debug(this.setConnection, `Connection set (${channel}): %o`, newConnection);

    this.debug(this.setConnection, `Current connection pool: %o`, ConnectionManager.pool);

    return true;
  }

  async delConnection(id: ConnectionID, channel: ConnectionChannel = 'default'): Promise<boolean> {
    this.loadConnections(channel);

    this.debug(this.delConnection, `Deleting connection (${channel}): %s`, id);

    const connectionMap = this.channelMap.get(channel);
    if (!connectionMap) {
      this.debug(this.delConnection, `Connection map not found (${channel})`);
      return false;
    }

    connectionMap.delete(id);
    const key = this.makeCacheKey(channel);
    await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    this.debug(this.delConnection, `Connection deleted (${key}): %s`, id);

    this.debug(this.delConnection, `Current connection pool: %o`, ConnectionManager.pool);

    return true;
  }

  async delConnections(ids: ConnectionID[], channel: ConnectionChannel = 'default'): Promise<boolean> {
    this.loadConnections(channel);

    this.debug(this.delConnections, `Deleting connections (${channel}): %o`, ids);

    const connectionMap = this.channelMap.get(channel);
    if (!connectionMap) {
      this.debug(this.delConnections, `Connection map not found (${channel})`);
      return false;
    }

    ids.forEach((id) => connectionMap.delete(id));
    const key = this.makeCacheKey(channel);
    await this.cache.set(key, Array.from(connectionMap.values() ?? []));
    this.debug(this.delConnections, `Connections deleted (${key}): %o`, ids);

    return true;
  }

  private static reservedDelConnections = new Set<ConnectionID>();

  static async delConnection(id: ConnectionID): Promise<void> {
    this.reservedDelConnections.add(id);
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
          await instance.cache.set(key, Array.from(connectionMap.values() ?? []));

          instance.debug(this.delConnections, `Connection deleted (${key}): %s`, id);
        }
      }
    }

    this.reservedDelConnections.clear();
  }

  isExpired(connection: Connection): boolean {
    const now = getUnixTime(new Date());
    const expired = connection.exp < now;
    if (expired) this.debug(this.isExpired, `Connection expired: %o`, connection);
    return !expired;
  }

  private debug(fn: Function, message: string, ...args: any[]) {
    console.log(`[${ConnectionManager.name}.${fn.name}] ${message}`, ...args);
  }
}
