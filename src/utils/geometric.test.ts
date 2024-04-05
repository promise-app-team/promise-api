import { findGeometricMedian } from './geometric';

describe(findGeometricMedian, () => {
  const randomLatitude = () => Math.random() * 180 - 90;
  const randomLongitude = () => Math.random() * 360 - 180;

  test('should return the geometric median of a list of points', () => {
    const points = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ];
    const result = findGeometricMedian(points);
    expect(result).toEqual({ latitude: 1, longitude: 1 });
  });

  test('should return the geometric median of a list of points with precision', () => {
    const points = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ];
    const result = findGeometricMedian(points, { precision: 1e-3 });
    expect(result).toEqual({ latitude: 1, longitude: 1 });
  });

  test('should throw an error when the list of points is empty', () => {
    expect(() => findGeometricMedian([])).toThrow('Cannot find the geometric median of an empty list of points');
  });

  test('should return the single point when the list of points has only one element', () => {
    const points = [{ latitude: 0, longitude: 0 }];
    const result = findGeometricMedian(points);
    expect(result).toEqual({ latitude: 0, longitude: 0 });
  });

  test('should return the single point when the list of points has only one element with precision', () => {
    const points = [{ latitude: 0, longitude: 0 }];
    const result = findGeometricMedian(points, { precision: 1e-3 });
    expect(result).toEqual({ latitude: 0, longitude: 0 });
  });

  test('should return the single point when the list of points has same coordinates', () => {
    const latitude = randomLatitude();
    const longitude = randomLongitude();

    const points = [
      { latitude, longitude },
      { latitude, longitude },
      { latitude, longitude },
    ];
    const result = findGeometricMedian(points);
    expect(result).toEqual({ latitude, longitude });
  });
});
