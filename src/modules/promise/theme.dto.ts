import { ApplyDTO } from '@/common/mixins/dto.mixin';
import { ThemeEntity } from '@/prisma/prisma.entity';

export class ThemeDTO extends ApplyDTO(ThemeEntity, ['id', 'name']) {}
