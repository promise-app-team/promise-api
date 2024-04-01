import { Test } from '@nestjs/testing';

import { createHttpServer } from '../../utils/http-server';

import { AppController } from '@/app/app.controller';
import { AppModule } from '@/app/app.module';

describe(AppController, () => {
  const http = createHttpServer<AppController>({
    ping: '/',
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    http.prepare(await app.init());
  });

  describe(http.name.ping, () => {
    test('should return pong', async () => {
      const response = await http.request.ping.get.expect(200);

      expect(response.body).toMatchObject({
        message: 'pong',
        env: 'test',
        tz: 'UTC',
      });
      expect(/^\d+?\.\d+?\.\d+?$/.test(response.body.version)).toBe(true);
      expect(() => new Date(response.body.build).toISOString()).not.toThrow();
      expect(() => new Date(response.body.deploy).toISOString()).not.toThrow();
    });
  });

  afterAll(async () => {
    await http.request.close();
  });
});
