import { PickType } from '@nestjs/swagger';
import { pick } from 'remeda';

import { ApplyDTO } from '@/common/mixins/dto.mixin';
import { LocationEntity } from '@/prisma';

const locationKeys = ['id', 'city', 'district', 'address'] as const;

export class LocationDTO extends ApplyDTO(PickType(LocationEntity, locationKeys), (obj: LocationEntity) => ({
  ...pick(obj, locationKeys),
  latitude: parseFloat(`${obj.latitude}`),
  longitude: parseFloat(`${obj.longitude}`),
})) {
  latitude: number;
  longitude: number;
}
