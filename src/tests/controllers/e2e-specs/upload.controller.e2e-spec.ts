import path from 'node:path';

import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { User } from '@prisma/client';

import { AppModule } from '@/app/app.module';
import { FileUploadController } from '@/modules/upload/upload.controller';
import { createUserBuilder } from '@/tests/fixtures/users';
import { createPrismaClient } from '@/tests/prisma';
import { createHttpServer } from '@/tests/utils/http-server';

const createUser = createUserBuilder(3e7);

describe(FileUploadController, () => {
  const prisma = createPrismaClient();
  const http = createHttpServer<FileUploadController>({
    uploadImageFile: '/upload/image',
  });

  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    http.prepare(await app.init());

    jwtService = module.get(JwtService);
  });

  const auth = { user: {} as User, token: '' };
  beforeEach(async () => {
    auth.user = await prisma.user.create({ data: createUser() });
    auth.token = jwtService.sign({ id: auth.user.id }, { expiresIn: '1h' });
  });

  describe(http.name.uploadImageFile, () => {
    test('should return uploaded file url', async () => {
      const res = await http.request.uploadImageFile.post
        .auth(auth.token, { type: 'bearer' })
        .attach('file', path.resolve(__dirname, '../../assets/promise-logo.png'))
        .expect(201);

      expect(/https:\/\/s3\..+\.amazonaws\.com\/.+\/.+/.test(res.body.url)).toBe(true);
    });
  });

  afterAll(async () => {
    await http.request.close();
  });
});
