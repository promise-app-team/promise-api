type SingleArgument = any;
type ArrayArguments = any[];
type ObjectArguments = Record<string, any>;
type ArgumentType<T, K extends keyof T> = T[K] extends ArrayArguments ? T[K] : [T[K]];

type MaybePromise<T> = T | Promise<T>;

export type TypedEvents = {
  [event: string]: ObjectArguments | ArrayArguments | SingleArgument;
};

export type TypedEventListener<
  TEvents extends TypedEvents,
  TEvent extends keyof TEvents = keyof TEvents,
> = TEvents[TEvent] extends ArrayArguments
  ? (...args: TEvents[TEvent]) => MaybePromise<any>
  : TEvents[TEvent] extends ObjectArguments
    ? (args: TEvents[TEvent]) => MaybePromise<any>
    : (arg: TEvents[TEvent]) => MaybePromise<any>;

export type TypedEventListenerMap<TEvents extends TypedEvents> = Map<keyof TEvents, Set<TypedEventListener<TEvents>>>;

export type TypedEventEmitterOptions<TEvents extends TypedEvents = TypedEvents> = {
  listenerMap?: TypedEventListenerMap<TEvents>;
};

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
    const onceListener = async (...args: any) => {
      this.off(event, onceListener);
      return listener.apply(this, args);
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

  public async emit<TEvent extends keyof TEvents>(
    event: TEvent,
    ...args: ArgumentType<TEvents, TEvent>
  ): Promise<boolean> {
    const listeners = this.listenerMap.get(event);
    if (!listeners) return false;
    await Promise.all([...listeners].map((listener) => listener.apply(this, args as any)));
    return true;
  }
}
