export type Methods<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];
