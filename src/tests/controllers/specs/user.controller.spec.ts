import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { pick } from 'remeda';

import { UserController, UserService } from '@/modules/user';
import { PrismaService } from '@/prisma';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/setups/prisma';

describe(UserController, () => {
  let userController: UserController;
  const prisma = createPrismaClient({ logging: false });
  const fixture = createTestFixture(prisma, { from: 2e6, to: 3e6 });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService, { provide: JwtService, useValue: {} }, { provide: PrismaService, useValue: prisma }],
    }).compile();

    userController = module.get(UserController);
  });

  test('should be defined', () => {
    expect(userController).toBeInstanceOf(UserController);
  });

  describe(UserController.prototype.getMyProfile, () => {
    test('should return my profile', async () => {
      const { input: user } = await fixture.write.user();
      await expect(userController.getMyProfile(user)).resolves.toMatchObject(
        pick(user, ['id', 'username', 'profileUrl'])
      );
    });
  });

  describe(UserController.prototype.updateMyProfile, () => {
    const username = 'newUsername';
    const profileUrl = 'http://new.profile.url';

    test('should update my profile', async () => {
      const { input: user } = await fixture.write.user();
      const updatedUser = { ...user, username, profileUrl };
      await expect(userController.updateMyProfile(user, { username, profileUrl })).resolves.toMatchObject(
        pick(updatedUser, ['id', 'username', 'profileUrl'])
      );
    });

    test('should set a default profileUrl', async () => {
      const { input: user } = await fixture.write.user();
      const updatedUser = { ...user, username };
      await expect(userController.updateMyProfile(user, { username, profileUrl: null })).resolves.toMatchObject({
        ...pick(updatedUser, ['id', 'username']),
        profileUrl: expect.toBeString(),
      });
    });

    test('should throw an error if a user is not found', async () => {
      const notFoundUser = fixture.input.user({ id: 0 });
      await expect(userController.updateMyProfile(notFoundUser, { username, profileUrl })).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown errors occur', async () => {
      const unknownUser = fixture.input.user({ id: 'unknown' as any });
      return expect(userController.updateMyProfile(unknownUser, { username, profileUrl })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(UserController.prototype.deleteMyProfile, () => {
    const reason = 'reason';

    test('should delete my profile', async () => {
      const { input: user } = await fixture.write.user();
      await expect(userController.deleteMyProfile(user, { reason })).resolves.toEqual({ id: user.id });
    });

    test('should throw an error if a user is not found', async () => {
      const notFoundUser = fixture.input.user({ id: 0 });
      await expect(userController.deleteMyProfile(notFoundUser, { reason })).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown errors occur', async () => {
      const unknownUser = fixture.input.user({ id: 'unknown' as any });
      return expect(userController.deleteMyProfile(unknownUser, { reason: 'unknown' })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});
