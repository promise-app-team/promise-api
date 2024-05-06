export interface TypedEvents {
  [event: string]: any;
}

export interface TypedEventListener<TEvents extends TypedEvents> {
  (...args: TEvents[keyof TEvents]): void | Promise<void>;
}

export interface TypedEventListenerMap<
  TEvents extends TypedEvents = TypedEvents,
  TEventListener extends TypedEventListener<TEvents>[] = TypedEventListener<TEvents>[],
> {
  get(event: keyof TEvents): TEventListener | undefined;
  set(event: keyof TEvents, listener: TEventListener): void;
  del(event: keyof TEvents): void;
}

const map = {
  map: new Map(),
  get(event: string) {
    return this.map.get(event);
  },
  set(event: string, listener: any[]) {
    this.map.set(event, listener);
  },
  del(event: string) {
    this.map.delete(event);
  },
};

export class TypedEventEmitter<TEvents extends TypedEvents> {
  constructor(private readonly listenerMap: TypedEventListenerMap<TEvents, TypedEventListener<TEvents>[]> = map) {}

  public on<K extends keyof TEvents>(event: K, listener: TypedEventListener<TEvents>): this {
    const listeners = this.listenerMap.get(event) || [];
    listeners.push(listener);
    this.listenerMap.set(event, listeners);
    return this;
  }

  public once<K extends keyof TEvents>(event: K, listener: TypedEventListener<TEvents>): this {
    const onceListener: TypedEventListener<TEvents> = async (...args) => {
      this.off(event, onceListener);
      await listener(...args);
    };

    return this.on(event, onceListener);
  }

  public off<K extends keyof TEvents>(event: K): this;
  public off<K extends keyof TEvents>(event: K, listener: TypedEventListener<TEvents>): this;
  public off<K extends keyof TEvents>(event: K, listener?: TypedEventListener<TEvents>): this {
    if (!listener) return this.listenerMap.del(event), this;

    const listeners = this.listenerMap.get(event);
    if (!listeners) return this;

    const index = listeners.indexOf(listener);
    if (index < 0) return this;

    listeners.splice(index, 1);
    if (listeners.length) {
      this.listenerMap.set(event, listeners);
    } else {
      this.listenerMap.del(event);
    }

    return this;
  }

  public async emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): Promise<boolean> {
    const listeners = this.listenerMap.get(event);
    if (!listeners) return false;
    await Promise.all(listeners.map((listener) => listener(...args)));
    return true;
  }
}
