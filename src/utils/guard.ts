export function ifs<T>(
  conditions: [condition: boolean, value: T][],
  elseValue: T | undefined = undefined
): T | undefined {
  for (const [condition, value] of conditions) {
    if (condition) {
      return value;
    }
  }
  return elseValue;
}

export function guard<T>(handler: () => T, defaultValue?: T): T;
export function guard<T>(handler: () => Promise<T>, defaultValue?: T): Promise<T>;
export function guard(handler: () => any, defaultValue = undefined): any {
  const result = handler();
  return result instanceof Promise ? result.catch(() => defaultValue) : result;
}
