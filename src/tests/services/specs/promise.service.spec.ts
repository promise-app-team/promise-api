import { Test } from '@nestjs/testing';

import { PromiseService } from '@/modules/promise/promise.service';
import { PrismaService } from '@/prisma/prisma.service';

describe(PromiseService, () => {
  let promiseService: PromiseService;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PromiseService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    promiseService = module.get(PromiseService);
  });

  afterAll(async () => {
    await prisma.$transaction(async (prisma) => {
      await prisma.promiseTheme.deleteMany();
      await prisma.promiseUser.deleteMany();
      await prisma.user.deleteMany();
      await prisma.promise.deleteMany();
      await prisma.location.deleteMany();
      await prisma.$queryRaw`ALTER TABLE pm_users AUTO_INCREMENT = 1;`;
      await prisma.$queryRaw`ALTER TABLE pm_promises AUTO_INCREMENT = 1;`;
      await prisma.$queryRaw`ALTER TABLE pm_locations AUTO_INCREMENT = 1;`;
    });
    await prisma.$disconnect();
  });

  test('should be defined', () => {
    expect(promiseService).toBeInstanceOf(PromiseService);
  });

  describe(PromiseService.prototype.exists, () => {
    test('should return true if the promise exists', async () => {});

    test('should return false if the promise does not exist', async () => {});

    test('should return true if the promise exists with the condition', async () => {});

    test('should return false if the promise does not exist with the condition', async () => {});
  });

  describe(PromiseService.prototype.findAllByUser, () => {});

  describe(PromiseService.prototype.findOneById, () => {});

  describe(PromiseService.prototype.create, () => {});

  describe(PromiseService.prototype.update, () => {});

  describe(PromiseService.prototype.getStartLocation, () => {});

  describe(PromiseService.prototype.updateStartLocation, () => {});

  describe(PromiseService.prototype.deleteStartLocation, () => {});

  describe(PromiseService.prototype.attend, () => {});

  describe(PromiseService.prototype.leave, () => {});

  describe(PromiseService.prototype.getThemes, () => {});
});
