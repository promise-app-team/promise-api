import { EventEmitter } from 'node:events';

type EventMap<T> = Record<keyof T, any[]> | DefaultEventMap;
type DefaultEventMap = [never];

type AnyRest = [...args: any[]];
type Args<K, T> = T extends DefaultEventMap ? AnyRest : K extends keyof T ? T[K] : never;
type Key<K, T> = T extends DefaultEventMap ? string | symbol : K | keyof T;
type Awaitable<T> = T | Promise<T>;

export type AsyncEventListener<K, T extends EventMap<T>> = T extends DefaultEventMap
  ? (...args: any[]) => Awaitable<any>
  : K extends keyof T
    ? T[K] extends unknown[]
      ? (...args: T[K]) => Awaitable<void>
      : never
    : never;

export class AsyncEventEmitter<T extends EventMap<T> = DefaultEventMap> extends EventEmitter<T> {
  override emit<K>(eventName: Key<K, T>, ...args: Args<K, T>): Promise<boolean>;
  override emit<K>(eventName: Key<K, T>, ...args: Args<K, T>): boolean;
  override emit<K>(eventName: Key<K, T>, ...args: Args<K, T>): Promise<boolean> | boolean {
    const listeners = this.listeners(eventName);
    const promises = listeners.map((listener) => listener(...args));

    if (promises.some(isPromiseLike)) {
      return Promise.all(promises).then(() => true);
    }

    return super.emit(eventName, ...args);
  }
}

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  if (value instanceof Promise) return true;
  return value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';
}
