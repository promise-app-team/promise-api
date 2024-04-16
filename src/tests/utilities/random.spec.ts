import { random } from '../../utils/random';

describe(random, () => {
  test('should return random boolean', () => {
    const result = random();
    expect(result).toBeBoolean();
  });

  test('should return random number', () => {
    const result = random(1, 10);
    expect(result).toBeNumber();
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(10);
  });

  test('should return random date', () => {
    const start = new Date('2021-01-01');
    const end = new Date('2021-12-31');
    const result = random(start, end);
    expect(result).toBeValidDate();
    expect(result.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  test('should return random element from array', () => {
    const array = [1, 2, 3, 4, 5];
    const result = random(array);
    expect(array).toContain(result);
  });
});
