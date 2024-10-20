import { createModelBuilder } from './builder'

import type { PromiseThemeModel } from '@/prisma'

export function createPromiseThemeBuilder(initialId: number) {
  return createModelBuilder<PromiseThemeModel, 'promiseId' | 'themeId'>(initialId, () => ({
    promiseId: 0,
    themeId: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}
