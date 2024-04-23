export type ConnectionID = string;
export type ConnectionEvent = string;
export type ConnectionStage = string;
export type ConnectionChannel = string;

export type ConnectionMap = Map<ConnectionID, Connection>;
export type ConnectionChannelMap = Map<ConnectionChannel, ConnectionMap>;
export type ConnectionEventMap = Map<ConnectionEvent, ConnectionChannelMap>;

export interface Connection {
  id: ConnectionID;
  iat: number;
  exp: number;
}

export interface ConnectionScope {
  event: ConnectionEvent;
  stage: ConnectionStage;
  channel?: ConnectionChannel;
}

export interface ConnectionCache {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
}
