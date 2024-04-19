import { EventEmitter } from 'node:events';

export class TypedEventEmitter<TEvents extends Record<string, any>> {
  constructor(private readonly emitter = new EventEmitter()) {}

  on<K extends keyof TEvents & string>(event: K, listener: (...args: TEvents[K]) => void) {
    this.emitter.on(event, listener);
  }

  off<K extends keyof TEvents & string>(event: K, listener: (...args: TEvents[K]) => void) {
    this.emitter.off(event, listener);
  }

  once<K extends keyof TEvents & string>(event: K, listener: (...args: TEvents[K]) => void) {
    this.emitter.once(event, listener);
  }

  emit<K extends keyof TEvents & string>(event: K, ...args: TEvents[K]) {
    this.emitter.emit(event, ...(args as any[]));
  }
}
