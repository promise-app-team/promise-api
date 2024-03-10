import { Test } from '@nestjs/testing';

import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma';
import { PrismaServiceMock } from '@/tests/services/mocks/prisma.service.mock';

describe(UserService, () => {
  let userService: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useClass: PrismaServiceMock }],
    }).compile();

    userService = module.get(UserService);
  });

  describe(UserService.prototype.findOneById, () => {
    test('should return a user by id', () => {
      return expect(userService.findOneById('1')).resolves.toMatchObject({ id: 1 });
    });
  });

  describe('refresh', () => {});
});
