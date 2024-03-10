export type MaybePromise<T> = T | Promise<T>;

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function after<T = any>(ms: number, fn: MaybePromise<T>): Promise<T> {
  await sleep(ms);
  return fn instanceof Promise ? await fn : fn;
}
