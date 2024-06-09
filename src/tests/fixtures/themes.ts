import { randomString } from 'remeda';

import { createModelBuilder } from './builder';

import type { ThemeModel } from '@/prisma';

export function createThemeBuilder(initialId: number) {
  return createModelBuilder<ThemeModel>(initialId, (id) => ({
    id,
    name: randomString(10).toUpperCase(),
  }));
}
