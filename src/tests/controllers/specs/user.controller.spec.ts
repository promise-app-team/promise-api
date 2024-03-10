import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { UserController } from '@/modules/user/user.controller';
import { UserService, UserServiceError } from '@/modules/user/user.service';
import { _fixture_invalidUser, _fixture_unknownUser, _fixture_validUser } from '@/tests/fixtures/users';
import { MockJwtService } from '@/tests/services/mocks/jwt.service.mock';
import { MockUserService } from '@/tests/services/mocks/user.service.mock';

describe(UserController, () => {
  let authController: UserController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: JwtService, useValue: MockJwtService },
        { provide: UserService, useValue: MockUserService },
      ],
    }).compile();

    authController = module.get(UserController);
  });

  test('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe(UserController.prototype.getMyProfile, () => {
    test('should return my profile', async () => {
      return expect(authController.getMyProfile(_fixture_validUser)).resolves.toMatchObject({ id: 1 });
    });
  });

  describe(UserController.prototype.updateMyProfile, () => {
    const username = 'newUsername';
    const profileUrl = 'http://new.profile.url';

    test('should update my profile', async () => {
      return expect(
        authController.updateMyProfile(_fixture_validUser, { username, profileUrl })
      ).resolves.toMatchObject({
        username,
        profileUrl,
      });
    });

    test('should set a default profileUrl', async () => {
      return expect(
        authController.updateMyProfile(_fixture_validUser, { username, profileUrl: null })
      ).resolves.toMatchObject({
        id: 1,
        username,
        profileUrl: expect.any(String),
      });
    });

    test('should throw an error if a user is not found', async () => {
      return expect(
        authController.updateMyProfile(_fixture_unknownUser, { username: '0', profileUrl })
      ).rejects.toMatchObject({
        message: UserServiceError.NotFoundUser,
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown errors occur', async () => {
      return expect(
        authController.updateMyProfile(_fixture_invalidUser, { username: '0', profileUrl })
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(UserController.prototype.deleteMyProfile, () => {
    const reason = 'reason';

    test('should delete my profile', async () => {
      return expect(authController.deleteMyProfile(_fixture_validUser, { reason })).resolves.toMatchObject({ id: 1 });
    });

    test('should throw an error if a user is not found', async () => {
      return expect(authController.deleteMyProfile(_fixture_unknownUser, { reason })).rejects.toMatchObject({
        message: UserServiceError.NotFoundUser,
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown errors occur', async () => {
      return expect(authController.deleteMyProfile(_fixture_invalidUser, { reason: 'unknown' })).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});
