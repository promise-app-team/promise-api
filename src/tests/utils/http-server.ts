import { INestApplication } from '@nestjs/common';
import { mapValues } from 'remeda';
import request from 'supertest';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

type ExtractMethodName<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type RequestTestMap = Record<HttpMethod, request.Test>;

export type HttpRequest<T> = Record<ExtractMethodName<T>, RequestTestMap> & {
  close: INestApplication['close'];
};

export function initializeHttpRequest<T>(app: INestApplication, routes: Routes<T>): HttpRequest<T> {
  const http = {} as HttpRequest<T>;
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
  name: Routes<T>;
  prepare(app: INestApplication): void;
  request: HttpRequest<T>;
};

export function createHttpServer<T>(routes: Routes<T>): HttpServer<T> {
  let request: HttpRequest<T>;

  return {
    name: mapValues(routes, (path, operator) => `${path} (${operator})`) as Routes<T>,
    prepare(app: INestApplication) {
      request = initializeHttpRequest<T>(app, routes);
    },
    get request() {
      if (!request) throw new Error('Server is not prepared');
      return request;
    },
  };
}
