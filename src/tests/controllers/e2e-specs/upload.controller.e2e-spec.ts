import path from 'node:path';

import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/app/app.module';
import { FileUploadController } from '@/modules/upload/upload.controller';
import { createHttpRequest } from '@/tests/controllers/utils/http-request';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/prisma';

describe(FileUploadController, () => {
  const prisma = createPrismaClient();
  const fixture = createTestFixture(prisma, { from: 3e7, to: 4e7 });
  const http = createHttpRequest<FileUploadController>('upload', {
    uploadImageFile: 'image',
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    http.prepare(await app.init());

    const { input: authUser } = await fixture.write.user();
    http.request.authorize(authUser, { jwt: module.get(JwtService) });
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
    await http.request.close();
  });
});
