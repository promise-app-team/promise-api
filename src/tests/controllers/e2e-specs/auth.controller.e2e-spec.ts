import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { createHttpRequest } from '../utils/http-request';

import { AppModule } from '@/app';
import { HttpException } from '@/common/exceptions';
import { configure } from '@/main';
import { AuthController, AuthServiceError, JwtAuthTokenService } from '@/modules/auth';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/setups/prisma';

describe(AuthController, () => {
  const prisma = createPrismaClient();
  const fixture = createTestFixture(prisma, { from: 1e7, to: 2e7 });
  const http = createHttpRequest<AuthController>('auth', {
    refreshTokens: 'refresh',
    login: 'login',
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

  describe(http.request.login, () => {
    test('should return access token and refresh token when user is already registered', async () => {
      const { input: user } = await fixture.write.user();
      const res1 = await http.request.login().post.send(user).expect(201);

      expect(res1.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    test('should return access token and refresh token when user is not registered', async () => {
      const user = fixture.input.user();
      const res1 = await http.request.login().post.send(user).expect(201);

      expect(res1.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    test('should return 400 error if username is not provided', async () => {
      await http.request.login().post.send({}).expect(400);
    });

    test('should return 400 error if username is too long', async () => {
      await http.request
        .login()
        .post.send({ username: 'username'.repeat(100) })
        .expect(400);
    });
  });

  describe(http.request.refreshTokens, () => {
    test('should return new access token and refresh token', async () => {
      const user = await fixture.write.user.output();
      const res = await http.request.login().post.send(user).expect(201);
      const res2 = await http.request.refreshTokens().post.send({ refreshToken: res.body.refreshToken }).expect(201);

      expect(res2.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    test('should throw 401 error when refresh token is invalid', async () => {
      const res = await http.request.refreshTokens().post.send({ refreshToken: 'invalid-token' }).expect(400);

      expect(res.body).toEqual(HttpException.new(AuthServiceError.AuthTokenInvalid, 'BAD_REQUEST').getResponse());
    });

    test('should throw 400 error when refresh token is expired', async () => {
      const res = await http.request
        .refreshTokens()
        .post.send({ refreshToken: jwt.generateRefreshToken({ sub: 0 }, 0) })
        .expect(400);

      expect(res.body).toEqual(HttpException.new(AuthServiceError.AuthTokenExpired, 'BAD_REQUEST').getResponse());
    });

    test('should throw 404 error when user not found', async () => {
      const res = await http.request
        .refreshTokens()
        .post.send({ refreshToken: jwt.generateRefreshToken({ sub: 0 }) })
        .expect(404);

      expect(res.body).toEqual(HttpException.new(AuthServiceError.UserNotFound, 'NOT_FOUND').getResponse());
    });

    test('should throw 500 error when unknown error occurred', async () => {
      const res2 = await http.request
        .refreshTokens()
        .post.send({ refreshToken: jwt.generateRefreshToken({ sub: 'unknown' as any }) })
        .expect(500);
      expect(res2.body).toMatchObject({ statusCode: 500, error: 'Internal Server Error' });
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await http.request.close();
  });
});
