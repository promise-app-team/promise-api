import { mapValues } from 'remeda';

type Properties<T> = {
  [K in keyof T]: T[K];
};

type Mock<T> = {
  [P in keyof T]: T[P] extends (...args: infer A) => infer R ? jest.Mock<R, A> : never;
};

export function mock<T = any>(target: Properties<T>): Mock<T> {
  return mapValues<any, any>(target, (value) => (typeof value === 'function' ? jest.fn(value) : mock(value))) as any;
}

export function partialMock<T>(target: Partial<Properties<T>>): Mock<T> {
  return mapValues<any, any>(target, (value) => (typeof value === 'function' ? jest.fn(value) : mock(value))) as any;
}
