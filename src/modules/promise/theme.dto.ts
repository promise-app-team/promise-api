import { ApplyDTO } from '@/common';
import { ThemeEntity } from '@/prisma';

export class ThemeDTO extends ApplyDTO(ThemeEntity, ['id', 'name']) {}
