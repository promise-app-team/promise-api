import { Test } from '@nestjs/testing';

import { UserService, UserServiceError } from '@/modules/user/user.service';
import { PrismaService, Provider } from '@/prisma';
import { MockPrismaService } from '@/tests/services/mocks/prisma.service.mock';
import { MockUserID, MockUserProviderID } from '@/tests/services/mocks/user.service.mock';

describe(UserService, () => {
  let userService: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useClass: MockPrismaService }],
    }).compile();

    userService = module.get(UserService);
  });

  describe(UserService.prototype.findOneById, () => {
    test('should return a user by id', async () => {
      return expect(userService.findOneById(MockUserID.Valid)).resolves.toMatchObject({ id: 1 });
    });

    test('should throw an error if a user is not found', async () => {
      return expect(userService.findOneById(MockUserID.NotFound)).rejects.toEqual(UserServiceError.NotFoundUser);
    });
  });

  describe(UserService.prototype.findOneByProvider, () => {
    test('should return a user by provider and providerId', async () => {
      return expect(userService.findOneByProvider(Provider.KAKAO, MockUserProviderID.Valid)).resolves.toMatchObject({
        id: MockUserID.Valid,
      });
    });

    test('should throw an error if a user is not found', async () => {
      return expect(userService.findOneByProvider(Provider.KAKAO, MockUserProviderID.NotFound)).rejects.toEqual(
        UserServiceError.NotFoundUser
      );
    });
  });

  describe(UserService.prototype.upsert, () => {
    test('should create a user if not found', async () => {
      return expect(
        userService.upsert({
          username: 'username',
          profileUrl: 'http://profile.url',
          provider: Provider.KAKAO,
          providerId: MockUserProviderID.NotFound,
        })
      ).resolves.toMatchObject({ id: MockUserID.Valid });
    });

    test('should update a user if found', async () => {
      return expect(
        userService.upsert({
          username: 'username',
          profileUrl: 'http://profile.url',
          provider: Provider.KAKAO,
          providerId: MockUserProviderID.Valid,
        })
      ).resolves.toMatchObject({ id: MockUserID.Valid });
    });

    test('should set a default profileUrl', async () => {
      return expect(
        userService.upsert({
          username: 'username',
          profileUrl: null,
          provider: Provider.KAKAO,
          providerId: MockUserProviderID.NotFound,
        })
      ).resolves.toMatchObject({ id: MockUserID.Valid, profileUrl: expect.any(String) });
    });
  });

  describe(UserService.prototype.update, () => {
    const username = 'changed username';
    const profileUrl = 'http://changed.profile.url';

    test('should update a user', async () => {
      return expect(
        userService.update(MockUserID.Valid, {
          username,
          profileUrl,
        })
      ).resolves.toMatchObject({ id: MockUserID.Valid, username, profileUrl });
    });

    test('should set a default profileUrl', async () => {
      return expect(
        userService.update(MockUserID.Valid, {
          username,
          profileUrl: null,
        })
      ).resolves.toMatchObject({ id: MockUserID.Valid, username, profileUrl: expect.any(String) });
    });

    test('should throw an error if a user is not found', async () => {
      return expect(
        userService.update(MockUserID.NotFound, {
          username,
          profileUrl,
        })
      ).rejects.toEqual(UserServiceError.NotFoundUser);
    });

    test('should throw an error when unknown error occurred', async () => {
      return expect(
        userService.update(MockUserID.Unknown, {
          username,
          profileUrl,
        })
      ).rejects.toEqual(new Error());
    });
  });

  describe(UserService.prototype.delete, () => {
    test('should delete a user', async () => {
      return expect(userService.delete(MockUserID.Valid, 'reason')).resolves.toMatchObject({ id: MockUserID.Valid });
    });

    test('should throw an error if a user is not found', async () => {
      return expect(userService.delete(MockUserID.NotFound, 'reason')).rejects.toEqual(UserServiceError.NotFoundUser);
    });

    test('should throw an error when unknown error occurred', async () => {
      return expect(userService.delete(MockUserID.Unknown, 'reason')).rejects.toEqual(new Error());
    });
  });
});
