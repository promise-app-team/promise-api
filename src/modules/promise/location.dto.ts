import { ApplyDTO } from '@/common';
import { LocationEntity } from '@/prisma';

export class LocationDTO extends ApplyDTO(LocationEntity, ['id', 'city', 'district', 'address'], (obj) => ({
  latitude: parseFloat(`${obj.latitude}`),
  longitude: parseFloat(`${obj.longitude}`),
})) {
  latitude: number;
  longitude: number;
}
