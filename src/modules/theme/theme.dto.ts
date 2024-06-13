import { ApplyDTO } from '@/common/mixins';
import { ThemeEntity } from '@/prisma';

export class ThemeDTO extends ApplyDTO(ThemeEntity, ['id', 'name']) {}
