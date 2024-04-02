import { randomString } from 'remeda';

import { createModelBuilder } from './builder';

import { ThemeModel } from '@/prisma/prisma.entity';

export function createThemeBuilder(initialId: number) {
  return createModelBuilder<ThemeModel>(initialId, (id) => ({
    id,
    name: randomString(10).toUpperCase(),
  }));
}
