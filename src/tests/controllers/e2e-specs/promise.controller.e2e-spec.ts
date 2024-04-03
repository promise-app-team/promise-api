import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/app/app.module';
import { InthashService } from '@/customs/inthash/inthash.service';
import { PromiseController } from '@/modules/promise/promise.controller';
import { createHttpRequest } from '@/tests/controllers/utils/http-request';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/prisma';

describe(PromiseController, () => {
  const prisma = createPrismaClient({ logging: false });
  const fixture = createTestFixture(prisma, { from: 4e7, to: 5e7 });
  const http = createHttpRequest<PromiseController>('promises', {
    getMyPromises: '',
    getPromise: ':pid(\\d+)',
    createPromise: '',
    updatePromise: '',
    attendPromise: '',
    leavePromise: '',
    getStartLocation: '',
    updateStartLocation: '',
    deleteStartLocation: '',
    getMiddleLocation: '',
    getThemes: '',
    dequeuePromise: '',
    enqueuePromise: '',
  });

  let hasher: InthashService;
  const encode = (id: number) => ({ pid: hasher.encode(id) });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    http.prepare(await app.init());

    const { input: authUser } = await fixture.write.user();
    http.request.authorize(authUser, { jwt: module.get(JwtService) });
    hasher = module.get(InthashService);
  });

  describe(http.request.getMyPromises, () => {});

  describe(http.request.getPromise, () => {
    test('should return promise', async () => {
      const { promise } = await fixture.write.promise();
      const res = await http.request.getPromise(encode(promise.output.id)).get.expect(200);
    });
  });
});
