import type { Methods } from '@/types';

export function mockGlobalFn(key: Methods<typeof globalThis>, fn = jest.fn()) {
  const original = globalThis[key];
  beforeAll(() => Reflect.set(globalThis, key, fn));
  afterAll(() => Reflect.set(globalThis, key, original));
}
