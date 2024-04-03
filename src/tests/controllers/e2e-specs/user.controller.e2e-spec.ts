import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { pick } from 'remeda';

import { createHttpRequest } from '../utils/http-request';

import { AppModule } from '@/app/app.module';
import { UserController } from '@/modules/user/user.controller';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/prisma';

describe(UserController, () => {
  const prisma = createPrismaClient();
  const fixture = createTestFixture(prisma, { from: 2e7, to: 3e7 });
  const http = createHttpRequest<UserController>('user', {
    getMyProfile: 'profile',
    updateMyProfile: 'profile',
    deleteMyProfile: 'profile',
  });

  let jwt: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    http.prepare(await app.init());

    jwt = module.get(JwtService);
    const { input: authUser } = await fixture.write.user();
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
      const accessToken = jwt.sign({ id: 0 }, { expiresIn: '1h' });
      const res = await http.request.getMyProfile().get.auth(accessToken, { type: 'bearer' }).expect(401);

      expect(res.body).toMatchObject({
        error: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe(http.request.updateMyProfile, () => {
    test('should update user profile', async () => {
      const res = await http.request
        .updateMyProfile()
        .put.send({ username: 'new username', profileUrl: 'new profileUrl' })
        .expect(200);

      expect(res.body).toEqual({
        ...pick(http.request.auth.user, ['id', 'provider']),
        username: 'new username',
        profileUrl: 'new profileUrl',
        createdAt: expect.any(String),
      });
    });

    test('should return 401 if user is not found', async () => {
      const accessToken = jwt.sign({ id: 0 }, { expiresIn: '1h' });
      const res = await http.request
        .updateMyProfile()
        .put.auth(accessToken, { type: 'bearer' })
        .send({ username: 'new username', profileUrl: 'new profileUrl' })
        .expect(401);

      expect(res.body).toMatchObject({
        error: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe(http.request.deleteMyProfile, () => {
    test('should delete user profile', async () => {
      const res = await http.request.deleteMyProfile().delete.send({ reason: 'test' }).expect(200);

      expect(res.body).toEqual({
        id: http.request.auth.user.id,
      });
    });

    test('should return 401 if user is not found', async () => {
      const accessToken = jwt.sign({ id: 0 }, { expiresIn: '1h' });
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
