import { Prisma } from '@prisma/client'

export type DecimalLike = number | string | Prisma.Decimal

interface CustomMatchers<R = unknown> {
  toBeDecimalLike(expected: DecimalLike, precision?: number): R
  toBeISO8601(): R
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

expect.extend({
  toBeDecimalLike(actual: DecimalLike, expected: DecimalLike, precision = 4) {
    try {
      const actualValue = toFloat(actual, precision)
      const expectedValue = toFloat(expected, precision)

      return {
        pass: actualValue === expectedValue,
        message: () => `Expected ${actualValue} to be equal to ${expectedValue}`,
      }
    }
    catch {
      return {
        pass: false,
        message: () => `Expected ${actual} to be a valid Decimal`,
      }
    }
  },

  toBeISO8601(actual: string) {
    return {
      pass: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(actual),
      message: () => `Expected ${actual} to be an ISO8601 string`,
    }
  },
})

function toFloat(value: DecimalLike, precision = 6): number {
  const digits = 10 ** precision
  return Math.trunc(Number(new Prisma.Decimal(value)) * digits) / digits
}
