import path from 'node:path';

import { Test } from '@nestjs/testing';

import { AppModule } from '@/app';
import { configure } from '@/main';
import { JwtAuthTokenService } from '@/modules/auth';
import { FileUploadController } from '@/modules/upload';
import { createHttpRequest } from '@/tests/controllers/utils/http-request';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/setups/prisma';

import type { NestExpressApplication } from '@nestjs/platform-express';

describe(FileUploadController, () => {
  const prisma = createPrismaClient({ logging: false });
  const fixture = createTestFixture(prisma, { from: 3e7, to: 4e7 });
  const http = createHttpRequest<FileUploadController>('upload', {
    uploadImageFile: 'image',
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication<NestExpressApplication>();
    http.prepare(await configure(app).then((app) => app.init()));

    const authUser = await fixture.write.user.output();
    http.request.authorize(authUser, { jwt: module.get(JwtAuthTokenService) });
    fixture.configure({ authUser });
  });

  describe(http.request.uploadImageFile, () => {
    test('should return uploaded file url', async () => {
      const res = await http.request
        .uploadImageFile()
        .post.attach('file', path.resolve(__dirname, '../../assets/promise-logo.png'))
        .expect(201);

      expect(/https:\/\/s3\..+\.amazonaws\.com\/.+\/.+/.test(res.body.url)).toBeTrue();
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await http.request.close();
  });
});
