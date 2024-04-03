import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { createHttpServer } from '../../utils/http-server';

import { AppModule } from '@/app/app.module';
import { HttpException } from '@/common/exceptions/http.exception';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthServiceError } from '@/modules/auth/auth.service';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/prisma';

describe(AuthController, () => {
  const prisma = createPrismaClient();
  const fixture = createTestFixture(prisma, { from: 1e7, to: 2e7 });
  const http = createHttpServer<AuthController>({
    refreshTokens: '/auth/refresh',
    login: '/auth/login',
  });

  let jwt: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    http.prepare(await app.init());

    jwt = module.get(JwtService);
  });

  describe(http.name.login, () => {
    test('should return access token and refresh token', async () => {
      const { input: user } = await fixture.write.user();
      const res1 = await http.request.login.post.send(user).expect(201);

      expect(res1.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });
  });

  describe(http.name.refreshTokens, () => {
    beforeEach(async () => {
      const { input: user } = await fixture.write.user();
      http.request.authorize(user, { jwt });
    });

    test('should return new access token and refresh token', async () => {
      const refreshToken = jwt.sign({ id: http.request.auth.user.id }, { expiresIn: '1d' });
      const res2 = await http.request.refreshTokens.post.send({ refreshToken: refreshToken }).expect(201);

      expect(res2.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    test('should throw 401 error when token is not provided', async () => {
      http.request.unauthorize();
      const res = await http.request.refreshTokens.post.send({ refreshToken: 'any-token' }).expect(401);

      expect(res.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    test('should throw 401 error when user is not found from auth token', async () => {
      const authToken = jwt.sign({ id: 0 }, { expiresIn: '1h' });
      const res = await http.request.refreshTokens.post
        .auth(authToken, { type: 'bearer' })
        .send({ refreshToken: 'any-token' })
        .expect(401);

      expect(res.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    test('should throw 401 error when auth token is invalid', async () => {
      const res = await http.request.refreshTokens.post
        .auth('invalid-auth-token', { type: 'bearer' })
        .send({ refreshToken: 'any-token' })
        .expect(401);

      expect(res.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    test('should throw 401 error when refresh token is invalid', async () => {
      const res = await http.request.refreshTokens.post.send({ refreshToken: 'invalid-token' }).expect(400);

      expect(res.body).toEqual(HttpException.new(AuthServiceError.AuthTokenInvalid, 'BAD_REQUEST').getResponse());
    });

    test('should throw 400 error when refresh token is expired', async () => {
      const res = await http.request.refreshTokens.post
        .send({ refreshToken: jwt.sign({ id: 0 }, { expiresIn: '0s' }) })
        .expect(400);
      expect(res.body).toEqual(HttpException.new(AuthServiceError.AuthTokenExpired, 'BAD_REQUEST').getResponse());
    });

    test('should throw 404 error when user not found', async () => {
      const res = await http.request.refreshTokens.post
        .send({ refreshToken: jwt.sign({ id: 0 }, { expiresIn: '1d' }) })
        .expect(404);

      expect(res.body).toEqual(HttpException.new(AuthServiceError.UserNotFound, 'NOT_FOUND').getResponse());
    });

    test('should throw 500 error when unknown error occurred', async () => {
      const res2 = await http.request.refreshTokens.post
        .send({ refreshToken: jwt.sign({ id: 'unknown' }, { expiresIn: '1d' }) })
        .expect(500);
      expect(res2.body).toMatchObject({ statusCode: 500, error: 'Internal Server Error' });
    });
  });

  afterAll(async () => {
    await http.request.close();
  });
});
