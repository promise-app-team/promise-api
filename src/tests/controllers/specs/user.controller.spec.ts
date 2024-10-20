import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { JwtAuthTokenService } from '@/modules/auth'
import { UserController, UserService } from '@/modules/user'
import { PrismaService } from '@/prisma'
import { createTestFixture } from '@/tests/fixtures'
import { createPrismaClient } from '@/tests/setups/prisma'

describe(UserController, () => {
  let userController: UserController
  const prisma = createPrismaClient({ logging: false })
  const fixture = createTestFixture(prisma, { from: 2e6, to: 3e6 })

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        { provide: JwtAuthTokenService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    userController = module.get(UserController)
  })

  test('should be defined', () => {
    expect(userController).toBeInstanceOf(UserController)
  })

  describe(UserController.prototype.getMyProfile, () => {})

  describe(UserController.prototype.updateMyProfile, () => {
    test('should throw an error when user is not found', async () => {
      const unknownUser = fixture.input.user({ id: 0 })
      return expect(
        userController.updateMyProfile(unknownUser, {
          username: 'newUsername',
          profileUrl: 'http://new.profile.url',
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      })
    })

    test('should throw an error when unknown errors occur', async () => {
      const unknownUser = fixture.input.user({ id: 'unknown' as any })
      return expect(
        userController.updateMyProfile(unknownUser, {
          username: 'newUsername',
          profileUrl: 'http://new.profile.url',
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    })
  })

  describe(UserController.prototype.deleteMyProfile, () => {
    test('should throw an error when user is not found', async () => {
      const unknownUser = fixture.input.user({ id: 0 })
      return expect(userController.deleteMyProfile(unknownUser, { reason: 'unknown' })).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      })
    })

    test('should throw an error when unknown errors occur', async () => {
      const unknownUser = fixture.input.user({ id: 'unknown' as any })
      return expect(userController.deleteMyProfile(unknownUser, { reason: 'unknown' })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    })
  })
})
