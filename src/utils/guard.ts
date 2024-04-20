export function ifs<
  ConditionMap extends [boolean, any][],
  PossibleValueType = ConditionMap extends [boolean, infer R][] ? R : never,
>(conditionMaps: [...ConditionMap], elseValue?: PossibleValueType): PossibleValueType | undefined {
  for (const [condition, value] of conditionMaps) {
    if (condition) {
      return value;
    }
  }
  return elseValue;
}

export function guard<T>(handler: () => T, defaultValue?: T): T;
export function guard<T>(handler: () => Promise<T>, defaultValue?: T): Promise<T>;
export function guard(handler: () => any, defaultValue = undefined): any {
  try {
    const result = handler();
    return result instanceof Promise ? result.catch(() => defaultValue) : result;
  } catch {
    return defaultValue;
  }
}
