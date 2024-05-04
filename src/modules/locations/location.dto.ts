import { ApplyDTO } from '@/common/mixins';
import { LocationEntity } from '@/prisma';

export class PointDTO {
  ref: string;
  latitude: number;
  longitude: number;
}

export class LocationDTO extends ApplyDTO(LocationEntity, ['id', 'city', 'district', 'address'], (obj) => ({
  latitude: parseFloat(`${obj.latitude}`),
  longitude: parseFloat(`${obj.longitude}`),
})) {
  latitude: number;
  longitude: number;
}
