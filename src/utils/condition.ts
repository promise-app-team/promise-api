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
