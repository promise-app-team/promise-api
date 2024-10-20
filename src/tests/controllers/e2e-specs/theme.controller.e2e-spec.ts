import { Test } from '@nestjs/testing'

import { AppModule } from '@/app'
import { configure } from '@/main'
import { JwtAuthTokenService } from '@/modules/auth'
import { ThemeController } from '@/modules/theme'
import { createTestFixture } from '@/tests/fixtures'
import { createPrismaClient } from '@/tests/setups/prisma'

import { createHttpRequest } from '../utils/http-request'

import type { NestExpressApplication } from '@nestjs/platform-express'

describe(ThemeController, () => {
  const prisma = createPrismaClient({ logging: false })
  const fixture = createTestFixture(prisma, { from: 5e7, to: 6e7 })
  const http = createHttpRequest<ThemeController>('themes', {
    getThemes: '',
  })

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    const app = module.createNestApplication<NestExpressApplication>()
    http.prepare(await configure(app).then(app => app.init()))

    const authUser = await fixture.write.user.output()
    http.request.authorize(authUser, { jwt: module.get(JwtAuthTokenService) })
    fixture.configure({ authUser })
  })

  describe(http.request.getThemes, () => {
    test('should return themes', async () => {
      const themes = await fixture.write.themes.output(3)
      const res = await http.request.getThemes().get.expect(200)

      expect(res.body).toIncludeSameMembers(themes.map(theme => ({ id: theme.id, name: theme.name })))
    })
  })
})
