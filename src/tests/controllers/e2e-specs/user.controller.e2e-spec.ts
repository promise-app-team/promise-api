import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { pick } from 'remeda';

import { createHttpRequest } from '../utils/http-request';

import { AppModule } from '@/app';
import { configure } from '@/main';
import { JwtAuthTokenService } from '@/modules/auth';
import { UserController } from '@/modules/user';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/setups/prisma';

describe(UserController, () => {
  const prisma = createPrismaClient();
  const fixture = createTestFixture(prisma, { from: 2e7, to: 3e7 });
  const http = createHttpRequest<UserController>('user', {
    getMyProfile: 'profile',
    updateMyProfile: 'profile',
    deleteMyProfile: 'profile',
  });

  let jwt: JwtAuthTokenService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication<NestExpressApplication>();
    http.prepare(await configure(app).then((app) => app.init()));

    jwt = module.get(JwtAuthTokenService);
  });

  beforeEach(async () => {
    const authUser = await fixture.write.user.output();
    http.request.authorize(authUser, { jwt });
  });

  describe(http.request.getMyProfile, () => {
    test('should return user profile', async () => {
      const res = await http.request.getMyProfile().get.expect(200);
      expect(res.body).toEqual({
        ...pick(http.request.auth.user, ['id', 'username', 'profileUrl', 'provider']),
        createdAt: expect.any(String),
      });
    });

    test('should return 401 if user is not found', async () => {
      const accessToken = jwt.generateAccessToken({ sub: 0 });
      const res = await http.request.getMyProfile().get.auth(accessToken, { type: 'bearer' }).expect(401);

      expect(res.body).toMatchObject({
        error: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe(http.request.updateMyProfile, () => {
    test('should update user profile', async () => {
      const input = { username: 'new username', profileUrl: 'https://profile-url.png' };
      const res = await http.request.updateMyProfile().put.send(input).expect(200);

      expect(res.body).toEqual({
        ...pick(http.request.auth.user, ['id', 'provider']),
        ...input,
        createdAt: expect.any(String),
      });
    });

    test('should return 401 if user is not found', async () => {
      const accessToken = jwt.generateAccessToken({ sub: 0 });
      const res = await http.request.updateMyProfile().put.auth(accessToken, { type: 'bearer' }).send({}).expect(401);

      expect(res.body).toMatchObject({
        error: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe(http.request.deleteMyProfile, () => {
    test('should delete user profile', async () => {
      const res = await http.request
        .deleteMyProfile()
        .delete.send({ reason: 'test'.repeat(10) })
        .expect(200);

      expect(res.body).toEqual({
        id: http.request.auth.user.id,
      });
    });

    test('should return 400 if reason is too short', async () => {
      await http.request.deleteMyProfile().delete.send({ reason: 'test' }).expect(400);
    });

    test('should return 400 if reason is too long', async () => {
      await http.request
        .deleteMyProfile()
        .delete.send({ reason: 'test'.repeat(100) })
        .expect(400);
    });

    test('should return 401 if user is not found', async () => {
      const accessToken = jwt.generateAccessToken({ sub: 0 });
      const res = await http.request
        .deleteMyProfile()
        .delete.auth(accessToken, { type: 'bearer' })
        .send({ reason: 'test' })
        .expect(401);

      expect(res.body).toMatchObject({
        error: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  afterAll(async () => {
    await http.request.close();
  });
});
