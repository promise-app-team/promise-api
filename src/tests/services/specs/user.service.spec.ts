import { Test } from '@nestjs/testing';
import { pick } from 'remeda';

import { UserService, UserServiceError } from '@/modules/user/user.service';
import { Provider } from '@/prisma/prisma.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { userBuilder } from '@/tests/fixtures/users';

describe(UserService, () => {
  let userService: UserService;
  let prisma: PrismaService;

  const makeUser = userBuilder(10);

  beforeAll(async () => {
    prisma = new PrismaService();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    userService = module.get(UserService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  test('should be defined', () => {
    expect(userService).toBeInstanceOf(UserService);
  });

  describe(UserService.prototype.findOneById, () => {
    test('should return a user by id', async () => {
      const user = makeUser();
      await prisma.user.create({ data: user });
      await expect(userService.findOneById(user.id)).resolves.toMatchObject(
        pick(user, ['id', 'username', 'profileUrl', 'provider', 'providerId'])
      );
    });

    test('should throw an error if a user is not found', async () => {
      return expect(userService.findOneById(0)).rejects.toEqual(UserServiceError.NotFoundUser);
    });
  });

  describe(UserService.prototype.findOneByProvider, () => {
    test('should return a user by provider and providerId', async () => {
      const user = makeUser();
      await prisma.user.create({ data: user });
      await expect(userService.findOneByProvider(user)).resolves.toMatchObject(
        pick(user, ['id', 'username', 'profileUrl', 'provider', 'providerId'])
      );
    });

    test('should throw an error if a user is not found', async () => {
      await expect(userService.findOneByProvider({ provider: Provider.KAKAO, providerId: '0' })).rejects.toEqual(
        UserServiceError.NotFoundUser
      );
    });

    test('should throw an error when unknown error occurred', async () => {
      await expect(
        userService.findOneByProvider({ provider: Provider.KAKAO, providerId: 404 as any })
      ).rejects.toThrow();
    });
  });

  describe(UserService.prototype.upsert, () => {
    test('should create a user if not found', async () => {
      const user = makeUser();
      await expect(userService.upsert(user)).resolves.toMatchObject({ id: user.id });
    });

    test('should not update a user if found', async () => {
      const user = makeUser();
      await prisma.user.create({ data: user });
      await expect(userService.upsert(user)).resolves.toMatchObject(
        pick(user, ['id', 'username', 'profileUrl', 'provider', 'providerId'])
      );
    });

    test('should set a default profileUrl', async () => {
      const user = makeUser();
      return expect(userService.upsert({ ...user, profileUrl: null })).resolves.toMatchObject({
        ...pick(user, ['id', 'username', 'provider', 'providerId']),
        profileUrl: expect.any(String),
      });
    });
  });

  describe(UserService.prototype.update, () => {
    const username = 'changed username';
    const profileUrl = 'http://changed.profile.url';

    test('should update a user', async () => {
      const user = makeUser();
      const updatedUser = { ...user, username, profileUrl };
      await prisma.user.create({ data: user });
      return expect(userService.update(user.id, { username, profileUrl })).resolves.toMatchObject(
        pick(updatedUser, ['id', 'username', 'profileUrl'])
      );
    });

    test('should set a default profileUrl', async () => {
      const user = makeUser();
      await prisma.user.create({ data: user });
      const updatedUserData = { ...user, username, profileUrl: null };
      return expect(userService.update(user.id, updatedUserData)).resolves.toMatchObject({
        ...pick(updatedUserData, ['id', 'username']),
        profileUrl: expect.any(String),
      });
    });

    test('should throw an error if a user is not found', async () => {
      return expect(userService.update(-1, { username, profileUrl })).rejects.toEqual(UserServiceError.NotFoundUser);
    });
  });

  describe(UserService.prototype.delete, () => {
    test('should delete a user', async () => {
      const user = makeUser();
      await prisma.user.create({ data: user });
      await expect(userService.delete(user.id, 'reason')).resolves.toMatchObject(pick(user, ['id']));
    });

    test('should throw an error if a user is not found', async () => {
      return expect(userService.delete(0, 'reason')).rejects.toEqual(UserServiceError.NotFoundUser);
    });
  });
});
