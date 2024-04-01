export function memoize<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
  const cache: Map<string, any> = new Map();
  return (...args: any[]) => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) {
      cache.set(key, fn(...args));
    }
    return cache.get(key);
  };
}
