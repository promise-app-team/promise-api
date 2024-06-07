export interface Location {
  latitude: number;
  longitude: number;
}

function toRadian(degree: number): number {
  return (degree * Math.PI) / 180;
}

function toDegree(radian: number): number {
  return (radian * 180) / Math.PI;
}

export function findGeometricMidpoint(locations: Location[]): Location {
  if (locations.length === 0) throw new Error('No locations provided');
  if (locations.length === 1) return locations[0];

  const cartesian = { x: 0, y: 0, z: 0 };

  for (const location of locations) {
    const latitude = toRadian(location.latitude);
    const longitude = toRadian(location.longitude);

    cartesian.x += Math.cos(latitude) * Math.cos(longitude);
    cartesian.y += Math.cos(latitude) * Math.sin(longitude);
    cartesian.z += Math.sin(latitude);
  }

  const total = locations.length;

  cartesian.x /= total;
  cartesian.y /= total;
  cartesian.z /= total;

  const central = {
    latitude: Math.atan2(cartesian.z, Math.sqrt(cartesian.x ** 2 + cartesian.y ** 2)),
    longitude: Math.atan2(cartesian.y, cartesian.x),
  };

  return {
    latitude: toDegree(central.latitude),
    longitude: toDegree(central.longitude),
  };
}
