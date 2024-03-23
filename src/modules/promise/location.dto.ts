import { ApplyDTO } from '@/common/mixins/dto.mixin';
import { LocationEntity } from '@/prisma/prisma.entity';

export class PointDTO {
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
