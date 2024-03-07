import { PickType } from '@nestjs/swagger';
import { pick } from 'remeda';

import { ApplyDTO } from '@/common';
import { ThemeEntity } from '@/prisma';

const themeKeys = ['id', 'name'] as const;

export class ThemeDTO extends ApplyDTO(PickType(ThemeEntity, themeKeys), (obj: ThemeEntity) => ({
  ...pick(obj, themeKeys),
})) {}
