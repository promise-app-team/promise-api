import { Prisma } from '@prisma/client';

export type DecimalLike = number | string | Prisma.Decimal;

expect.extend({
  toBeDecimalLike(actual: DecimalLike, expected: DecimalLike, precision = 6) {
    const actualValue = new Prisma.Decimal(actual).toFixed(precision);
    const expectedValue = new Prisma.Decimal(expected).toFixed(precision);

    return {
      pass: actualValue === expectedValue,
      message: () => 'Test',
    };
  },
});
