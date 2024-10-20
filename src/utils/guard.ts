export function ifs<
  T = any,
  ConditionMap extends [boolean, any][] = [boolean, T][],
  PossibleValueType = ConditionMap extends [boolean, infer R][] ? R : never,
>(conditionMaps: [...ConditionMap]): PossibleValueType | undefined {
  for (const [condition, value] of conditionMaps) {
    if (condition) {
      return value
    }
  }
}

export function guard<T>(handler: () => T, defaultValue?: T): T
export function guard<T>(handler: () => Promise<T>, defaultValue?: T): Promise<T>
export function guard(handler: () => any, defaultValue = undefined): any {
  try {
    const result = handler()
    return result instanceof Promise ? result.catch(() => defaultValue) : result
  }
  catch {
    return defaultValue
  }
}
