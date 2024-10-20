import { findGeometricMidpoint } from '../../utils/geometric'

describe(findGeometricMidpoint, () => {
  const randomLatitude = () => Math.random() * 180 - 90
  const randomLongitude = () => Math.random() * 360 - 180

  test('should return the geometric median of a list of points', () => {
    const points = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ]
    const result = findGeometricMidpoint(points)
    expect(result.latitude).toBeCloseTo(1.0)
    expect(result.longitude).toBeCloseTo(1.0)
  })

  test('should throw an error when the list of points is empty', () => {
    expect(() => findGeometricMidpoint([])).toThrow('No locations provided')
  })

  test('should return the single point when the list of points has only one element', () => {
    const points = [{ latitude: 0, longitude: 0 }]
    const result = findGeometricMidpoint(points)
    expect(result).toEqual({ latitude: 0, longitude: 0 })
  })

  test('should return the single point when the list of points has same coordinates', () => {
    const latitude = randomLatitude()
    const longitude = randomLongitude()

    const points = [
      { latitude, longitude },
      { latitude, longitude },
      { latitude, longitude },
    ]
    const result = findGeometricMidpoint(points)
    expect(result.latitude).toBeCloseTo(latitude, 6)
    expect(result.longitude).toBeCloseTo(longitude, 6)
  })
})
