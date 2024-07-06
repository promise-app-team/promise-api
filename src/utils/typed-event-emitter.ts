export interface TypedEvents {
  [event: string]: any;
}

export interface TypedEventListener<TEvents extends TypedEvents, TEvent extends keyof TEvents = keyof TEvents> {
  (...args: TEvents[TEvent]): void | Promise<void>;
}

export type TypedEventListenerMap<TEvents extends TypedEvents> = Map<keyof TEvents, Set<TypedEventListener<TEvents>>>;

export interface TypedEventEmitterOptions<TEvents extends TypedEvents = TypedEvents> {
  listenerMap?: TypedEventListenerMap<TEvents>;
}

export class TypedEventEmitter<TEvents extends TypedEvents> {
  private listenerMap: TypedEventListenerMap<TEvents>;

  constructor(options: TypedEventEmitterOptions<TEvents> = {}) {
    this.listenerMap = options.listenerMap || new Map();
  }

  public on<TEvent extends keyof TEvents>(event: TEvent, listener: TypedEventListener<TEvents, TEvent>): this {
    const listeners = this.listenerMap.get(event) || new Set();
    listeners.add(listener as TypedEventListener<TEvents>);
    this.listenerMap.set(event, listeners);
    return this;
  }

  public once<TEvent extends keyof TEvents>(event: TEvent, listener: TypedEventListener<TEvents, TEvent>): this {
    const onceListener: TypedEventListener<TEvents, TEvent> = async (...args) => {
      this.off(event, onceListener);
      await listener(...args);
    };

    return this.on(event, onceListener);
  }

  public off<TEvent extends keyof TEvents>(event: TEvent, listener?: TypedEventListener<TEvents, TEvent>): this {
    if (!listener) return this.listenerMap.delete(event), this;

    const listeners = this.listenerMap.get(event);
    if (!listeners) return this;

    listeners.delete(listener as TypedEventListener<TEvents>);
    if (listeners.size > 0) {
      this.listenerMap.set(event, listeners);
    } else {
      this.listenerMap.delete(event);
    }

    return this;
  }

  public async emit<TEvent extends keyof TEvents>(event: TEvent, ...args: TEvents[TEvent]): Promise<boolean> {
    const listeners = this.listenerMap.get(event);
    if (!listeners) return false;
    await Promise.all([...listeners].map((listener) => listener(...args)));
    return true;
  }
}
