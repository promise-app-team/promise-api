import { INestApplication } from '@nestjs/common';
import request from 'supertest';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

type ExtractMethodName<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type ExtendRequestTest = Record<HttpMethod, request.Test>;

export type E2EHelper<T> = Record<ExtractMethodName<T>, ExtendRequestTest> & {
  close: INestApplication['close'];
};

export function initializeE2EHelper<T>(app: INestApplication, routes: Routes<T>): E2EHelper<T> {
  const http = {} as E2EHelper<T>;
  http.close = app.close.bind(app);

  for (const [route, path] of Object.entries(routes)) {
    http[route as ExtractMethodName<T>] = new Proxy({} as any, {
      get(_target, method: HttpMethod) {
        return request(app.getHttpServer())[method](path as string);
      },
    });
  }

  return http;
}

type Routes<T> = Record<ExtractMethodName<T>, string>;

export type HttpServer<T> = {
  route: Routes<T>;
  prepare(app: INestApplication): void;
  request: E2EHelper<T>;
};

export function createHttpServer<T>(routes: Routes<T>): HttpServer<T> {
  let helper: E2EHelper<T>;

  return {
    route: routes,
    prepare(app: INestApplication) {
      helper = initializeE2EHelper<T>(app, routes);
    },
    get request() {
      if (!helper) throw new Error('Server is not prepared');
      return helper;
    },
  };
}
