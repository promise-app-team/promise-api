import { Prisma } from '@prisma/client';

export type DecimalLike = number | string | Prisma.Decimal;

expect.extend({
  toBeDecimalLike(actual: DecimalLike, expected: DecimalLike, precision = 4) {
    try {
      const actualValue = toFloat(actual, precision);
      const expectedValue = toFloat(expected, precision);

      return {
        pass: actualValue === expectedValue,
        message: () => `Expected ${actualValue} to be equal to ${expectedValue}`,
      };
    } catch {
      return {
        pass: false,
        message: () => `Expected ${actual} to be a valid Decimal`,
      };
    }
  },
});

function toFloat(value: DecimalLike, precision = 6): number {
  const digits = 10 ** precision;
  return Math.trunc(Number(new Prisma.Decimal(value)) * digits) / digits;
}
