import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { createHttpServer } from './helper';

import { AppModule } from '@/app/app.module';
import { HttpException } from '@/common/exceptions/http.exception';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthServiceError } from '@/modules/auth/auth.service';
import { createUserBuilder } from '@/tests/fixtures/builder';
import { createPrismaClient } from '@/tests/prisma';

const createUser = createUserBuilder(1e7);

describe(AuthController, () => {
  const prisma = createPrismaClient();
  const http = createHttpServer<AuthController>({
    refreshTokens: '/auth/refresh',
    login: '/auth/login',
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

  describe(http.route.login, () => {
    test('should return access token and refresh token', async () => {
      const user = await prisma.user.create({ data: createUser() });
      const res1 = await http.request.login.post.send(user).expect(201);

      expect(res1.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });
  });

  describe(http.route.refreshTokens, () => {
    let accessToken = '';
    let refreshToken = '';

    beforeAll(async () => {
      const user = await prisma.user.create({ data: createUser() });
      const res = await http.request.login.post.send(user);
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    test('should return new access token and refresh token', async () => {
      const res2 = await http.request.refreshTokens.post
        .auth(accessToken, { type: 'bearer' })
        .send({ refreshToken: refreshToken })
        .expect(201);

      expect(res2.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    test('should throw 400 error when refresh token is invalid', async () => {
      const res = await http.request.refreshTokens.post
        .auth(accessToken, { type: 'bearer' })
        .send({ refreshToken: 'invalid-token' })
        .expect(400);

      expect(res.body).toEqual(HttpException.new(AuthServiceError.AuthTokenInvalid, 'BAD_REQUEST').getResponse());
    });

    test('should throw 400 error when refresh token is expired', async () => {
      const res = await http.request.refreshTokens.post
        .auth(accessToken, { type: 'bearer' })
        .send({ refreshToken: jwtService.sign({ id: 0 }, { expiresIn: '0s' }) })
        .expect(400);
      expect(res.body).toEqual(HttpException.new(AuthServiceError.AuthTokenExpired, 'BAD_REQUEST').getResponse());
    });

    test('should throw 404 error when user not found', async () => {
      const res = await http.request.refreshTokens.post
        .auth(accessToken, { type: 'bearer' })
        .send({ refreshToken: jwtService.sign({ id: 0 }, { expiresIn: '1d' }) })
        .expect(404);

      expect(res.body).toEqual(HttpException.new(AuthServiceError.UserNotFound, 'NOT_FOUND').getResponse());
    });

    test('should throw 500 error when unknown error occurred', async () => {
      const res2 = await http.request.refreshTokens.post
        .auth(accessToken, { type: 'bearer' })
        .send({ refreshToken: jwtService.sign({ id: 'unknown' }, { expiresIn: '1d' }) })
        .expect(500);
      expect(res2.body).toMatchObject({ statusCode: 500, error: 'Internal Server Error' });
    });
  });

  afterAll(async () => {
    await http.request.close();
  });
});
