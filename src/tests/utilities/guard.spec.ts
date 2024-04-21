import { ifs, guard } from '@/utils';

describe(ifs, () => {
  test('should return the value of the first condition that is true', () => {
    const value = ifs([
      [false, 'first'],
      [true, 'second'],
      [true, 'third'],
    ]);

    expect(value).toBe('second');
  });

  test('should return undefined if no condition is true', () => {
    const value = ifs([
      [false, 'first'],
      [false, 'second'],
      [false, 'third'],
    ]);

    expect(value).toBeUndefined();
  });

  test('should return undefined if conditions not provided', () => {
    const value = ifs([]);

    expect(value).toBeUndefined();
  });
});

describe(guard, () => {
  test('should return the value of the handler', () => {
    const value = guard(() => 'value');

    expect(value).toBe('value');
  });

  test('should return the value of the handler if it is a promise', async () => {
    const value = await guard(() => Promise.resolve('value'));

    expect(value).toBe('value');
  });

  test('should return the default value if the handler throws an error', () => {
    const value = guard(() => {
      throw new Error('error');
    }, 'default');

    expect(value).toBe('default');
  });

  test('should return the default value if the handler is a promise that rejects', async () => {
    const value = await guard(() => Promise.reject('error'), 'default');

    expect(value).toBe('default');
  });
});
