import { Test } from '@nestjs/testing';

import { AppController, AppModule } from '@/app';
import { configure } from '@/main';

import { createHttpRequest } from '../utils/http-request';

import type { NestExpressApplication } from '@nestjs/platform-express';

describe(AppController, () => {
  const http = createHttpRequest<AppController>('/', { ping: '' });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication<NestExpressApplication>();
    http.prepare(await configure(app).then((app) => app.init()));
  });

  describe(http.request.ping, () => {
    test('should return pong', async () => {
      const response = await http.request.ping().get.expect(200);

      expect(response.body).toMatchObject({
        message: 'pong',
        env: 'development',
        tz: 'UTC',
      });
      expect(/^\d+?\.\d+?\.\d+?$/.test(response.body.version)).toBeTrue();
      expect(() => new Date(response.body.build).toISOString()).not.toThrow();
      expect(() => new Date(response.body.deploy).toISOString()).not.toThrow();
    });
  });

  afterAll(async () => {
    await http.request.close();
  });
});
