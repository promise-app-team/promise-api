import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { pick } from 'remeda';

import { UserController } from '@/modules/user/user.controller';
import { UserService, UserServiceError } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createUserBuilder } from '@/tests/fixtures/users';
import { createPrismaClient } from '@/tests/prisma';

const createUser = createUserBuilder(2e6);

describe(UserController, () => {
  let userController: UserController;
  const prisma = createPrismaClient({ logging: false });

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
      const user = createUser();
      await prisma.user.create({ data: user });
      await expect(userController.getMyProfile(user)).resolves.toMatchObject(
        pick(user, ['id', 'username', 'profileUrl'])
      );
    });
  });

  describe(UserController.prototype.updateMyProfile, () => {
    const username = 'newUsername';
    const profileUrl = 'http://new.profile.url';

    test('should update my profile', async () => {
      const user = createUser();
      const updatedUser = { ...user, username, profileUrl };
      await prisma.user.create({ data: user });
      await expect(userController.updateMyProfile(user, { username, profileUrl })).resolves.toMatchObject(
        pick(updatedUser, ['id', 'username', 'profileUrl'])
      );
    });

    test('should set a default profileUrl', async () => {
      const user = createUser();
      const updatedUser = { ...user, username };
      await prisma.user.create({ data: user });
      await expect(userController.updateMyProfile(user, { username, profileUrl: null })).resolves.toMatchObject({
        ...pick(updatedUser, ['id', 'username']),
        profileUrl: expect.any(String),
      });
    });

    test('should throw an error if a user is not found', async () => {
      const notFoundUser = createUser({ id: 0 });
      await expect(userController.updateMyProfile(notFoundUser, { username, profileUrl })).rejects.toMatchObject({
        message: UserServiceError.NotFoundUser,
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown errors occur', async () => {
      const unknownUser = createUser({ id: 'unknown' as any });
      return expect(userController.updateMyProfile(unknownUser, { username, profileUrl })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(UserController.prototype.deleteMyProfile, () => {
    const reason = 'reason';

    test('should delete my profile', async () => {
      const user = createUser();
      await prisma.user.create({ data: user });
      await expect(userController.deleteMyProfile(user, { reason })).resolves.toEqual({ id: user.id });
    });

    test('should throw an error if a user is not found', async () => {
      const notFoundUser = createUser({ id: 0 });
      await expect(userController.deleteMyProfile(notFoundUser, { reason })).rejects.toMatchObject({
        message: UserServiceError.NotFoundUser,
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown errors occur', async () => {
      const unknownUser = createUser({ id: 'unknown' as any });
      return expect(userController.deleteMyProfile(unknownUser, { reason: 'unknown' })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});
