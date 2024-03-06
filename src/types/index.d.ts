export type Falsy = null | undefined | false | 0 | -0 | 0n | '';

export type Constructor<T = any> = new (...args: any[]) => T;
