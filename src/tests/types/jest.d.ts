import type { DecimalLike } from '../setups/setupAfterEnv';
import 'jest-extended';

export {};

interface CustomMatchers<R = unknown> {
  toBeDecimalLike(expected: DecimalLike, precision?: number): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}
