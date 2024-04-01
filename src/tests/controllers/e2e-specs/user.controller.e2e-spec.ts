import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { pick } from 'remeda';

import { createHttpServer } from '../../utils/http-server';

import { AppModule } from '@/app/app.module';
import { UserController } from '@/modules/user/user.controller';
import { createUserBuilder } from '@/tests/fixtures/builder';
import { createPrismaClient } from '@/tests/prisma';

const createUser = createUserBuilder(2e7);

describe(UserController, () => {
  const prisma = createPrismaClient();
  const http = createHttpServer<UserController>({
    getMyProfile: '/user/profile',
    updateMyProfile: '/user/profile',
    deleteMyProfile: '/user/profile',
  });

  let jwtService: JwtService;

  let globalUser: Awaited<ReturnType<typeof prisma.user.create>>;
  let accessToken = '';

  beforeAll(async () => {
    globalUser = await prisma.user.create({ data: createUser() });
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    http.prepare(await app.init());

    jwtService = module.get(JwtService);
    accessToken = jwtService.sign({ id: globalUser.id }, { expiresIn: '1h' });
  });

  describe(http.name.getMyProfile, () => {
    test('should return user profile', async () => {
      const res = await http.request.getMyProfile.get.auth(accessToken, { type: 'bearer' }).expect(200);

      expect(res.body).toEqual({
        ...pick(globalUser, ['id', 'username', 'profileUrl', 'provider']),
        createdAt: expect.any(String),
      });
    });

    test('should return 401 if user is not found', async () => {
      const accessToken = jwtService.sign({ id: 0 }, { expiresIn: '1h' });
      const res = await http.request.getMyProfile.get.auth(accessToken, { type: 'bearer' }).expect(401);

      expect(res.body).toMatchObject({
        error: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe(http.name.updateMyProfile, () => {
    test('should update user profile', async () => {
      const res = await http.request.updateMyProfile.put
        .auth(accessToken, { type: 'bearer' })
        .send({ username: 'new username', profileUrl: 'new profileUrl' })
        .expect(200);

      expect(res.body).toEqual({
        ...pick(globalUser, ['id', 'provider']),
        username: 'new username',
        profileUrl: 'new profileUrl',
        createdAt: expect.any(String),
      });
    });

    test('should return 401 if user is not found', async () => {
      const accessToken = jwtService.sign({ id: 0 }, { expiresIn: '1h' });
      const res = await http.request.updateMyProfile.put
        .auth(accessToken, { type: 'bearer' })
        .send({ username: 'new username', profileUrl: 'new profileUrl' })
        .expect(401);

      expect(res.body).toMatchObject({
        error: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe(http.name.deleteMyProfile, () => {
    test('should delete user profile', async () => {
      const res = await http.request.deleteMyProfile.delete
        .auth(accessToken, { type: 'bearer' })
        .send({ reason: 'test' })
        .expect(200);

      expect(res.body).toEqual({
        id: globalUser.id,
      });
    });

    test('should return 401 if user is not found', async () => {
      const accessToken = jwtService.sign({ id: 0 }, { expiresIn: '1h' });
      const res = await http.request.deleteMyProfile.delete
        .auth(accessToken, { type: 'bearer' })
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
