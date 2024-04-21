export interface TypedEventListener<TEvents extends Record<string, any> = Record<string, any>> {
  (...args: TEvents[keyof TEvents]): void | Promise<void>;
}

export interface TypedEventListenerMap<
  TEvents extends Record<string, any> = Record<string, any>,
  TEventListener extends TypedEventListener<TEvents>[] = TypedEventListener<TEvents>[],
> {
  get(event: keyof TEvents): TEventListener | undefined;
  set(event: keyof TEvents, listener: TEventListener): void;
}

export class TypedEventEmitter<TEvents extends Record<string, any>> {
  constructor(
    private readonly listenerMap: TypedEventListenerMap<TEvents, TypedEventListener<TEvents>[]> = new Map()
  ) {}

  on<K extends keyof TEvents & string>(event: K, listener: TypedEventListener<TEvents>) {
    const listeners = this.listenerMap.get(event) || [];
    listeners.push(listener);
    this.listenerMap.set(event, listeners);
  }

  off<K extends keyof TEvents & string>(event: K, listener: TypedEventListener<TEvents>) {
    const listeners = this.listenerMap.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
    this.listenerMap.set(event, listeners);
  }

  once<K extends keyof TEvents & string>(event: K, listener: TypedEventListener<TEvents>) {
    const onceListener: TypedEventListener<TEvents> = (...args) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
  }

  async emit<K extends keyof TEvents & string>(event: K, ...args: TEvents[K]) {
    const listeners = this.listenerMap.get(event) || [];
    await Promise.all(listeners.map((listener) => listener(...args)));
  }
}
