export interface Point {
  latitude: number;
  longitude: number;
}

function toRadian(degree: number): number {
  return (degree * Math.PI) / 180;
}

/**
 * Calculate the distance between two points using the Haversine formula
 *
 * @param p1 first point
 * @param p2 second point
 * @returns distance in meters
 */
export function distanceByHaversine(p1: Point, p2: Point): number {
  const R = 6371e3; // radius of the Earth in meters
  const φ1 = toRadian(p1.latitude);
  const φ2 = toRadian(p2.latitude);
  const Δφ = toRadian(p2.latitude - p1.latitude);
  const Δλ = toRadian(p2.longitude - p1.longitude);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function findGeometricMedian(
  points: Point[],
  options?: { precision?: number }
): Point {
  const { precision = 1e-5 } = options || {};

  let currentPoint = points[0];
  let hasConverged = false;

  while (!hasConverged) {
    let sumX = 0;
    let sumY = 0;
    let totalWeight = 0;

    for (const point of points) {
      const distance = distanceByHaversine(currentPoint, point);
      if (!distance) continue;

      sumX += point.latitude / distance;
      sumY += point.longitude / distance;
      totalWeight += 1 / distance;
    }

    const newPoint = {
      lat: sumX / totalWeight,
      lng: sumY / totalWeight,
    };

    hasConverged =
      Math.abs(newPoint.lat - currentPoint.latitude) < precision &&
      Math.abs(newPoint.lng - currentPoint.longitude) < precision;

    const truncate = (num: number) => {
      const digits = Math.ceil(-Math.log10(precision));
      return parseFloat(num.toFixed(digits));
    };

    currentPoint = {
      latitude: truncate(newPoint.lat),
      longitude: truncate(newPoint.lng),
    };
  }

  return currentPoint;
}

// const points: Point[] = [
//   { latitude: 37.56070556, longitude: 126.9105306 }, // 마포구
//   { latitude: 37.57636667, longitude: 126.9388972 }, // 서대문구
//   { latitude: 37.63695556, longitude: 127.0277194 }, // 강북구
// ];

// const median = findGeometricMedian(points);
// console.log(median); // { lat: 37.57637, lng: 126.9389 }
