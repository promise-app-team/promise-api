import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { pick } from 'remeda';

import { UserController } from '@/modules/user/user.controller';
import { UserService, UserServiceError } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { userBuilder } from '@/tests/fixtures/users';

describe(UserController, () => {
  let userController: UserController;
  let prisma: PrismaService;

  const makeUser = userBuilder(10e3);

  beforeAll(async () => {
    prisma = new PrismaService();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService, { provide: JwtService, useValue: {} }, { provide: PrismaService, useValue: prisma }],
    }).compile();

    userController = module.get(UserController);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  test('should be defined', () => {
    expect(userController).toBeInstanceOf(UserController);
  });

  describe(UserController.prototype.getMyProfile, () => {
    test('should return my profile', async () => {
      const user = makeUser();
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
      const user = makeUser();
      const updatedUser = { ...user, username, profileUrl };
      await prisma.user.create({ data: user });
      await expect(userController.updateMyProfile(user, { username, profileUrl })).resolves.toMatchObject(
        pick(updatedUser, ['id', 'username', 'profileUrl'])
      );
    });

    test('should set a default profileUrl', async () => {
      const user = makeUser();
      const updatedUser = { ...user, username };
      await prisma.user.create({ data: user });
      await expect(userController.updateMyProfile(user, { username, profileUrl: null })).resolves.toMatchObject({
        ...pick(updatedUser, ['id', 'username']),
        profileUrl: expect.any(String),
      });
    });

    test('should throw an error if a user is not found', async () => {
      const notFoundUser = makeUser(0);
      await expect(userController.updateMyProfile(notFoundUser, { username, profileUrl })).rejects.toMatchObject({
        message: UserServiceError.NotFoundUser,
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown errors occur', async () => {
      const unknownUser = makeUser('unknown' as any);
      return expect(userController.updateMyProfile(unknownUser, { username, profileUrl })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(UserController.prototype.deleteMyProfile, () => {
    const reason = 'reason';

    test('should delete my profile', async () => {
      const user = makeUser();
      await prisma.user.create({ data: user });
      await expect(userController.deleteMyProfile(user, { reason })).resolves.toEqual({ id: user.id });
    });

    test('should throw an error if a user is not found', async () => {
      const notFoundUser = makeUser(0);
      await expect(userController.deleteMyProfile(notFoundUser, { reason })).rejects.toMatchObject({
        message: UserServiceError.NotFoundUser,
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown errors occur', async () => {
      const unknownUser = makeUser('unknown' as any);
      return expect(userController.deleteMyProfile(unknownUser, { reason: 'unknown' })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});
