import { ApplyDTO } from '@/common';
import { ThemeEntity } from '@/prisma/prisma.entity';

export class ThemeDTO extends ApplyDTO(ThemeEntity, ['id', 'name']) {}
