import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { mapValues } from 'remeda';
import request from 'supertest';

import { UserModel } from '@/prisma/prisma.entity';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

type ExtractMethodName<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type RequestTestMap = Record<HttpMethod, request.Test>;

type Routes<T> = Record<ExtractMethodName<T>, string>;

type Auth = {
  user: UserModel;
  token: string;
};

type HttpRequest<T> = Record<ExtractMethodName<T>, RequestTestMap> & {
  auth: Auth;
  close: INestApplication['close'];
  authorize(token: string): void;
  authorize<U extends UserModel>(user: U, options: { jwt: JwtService }): void;
  unauthorize(): void;
};

function initializeHttpRequest<T>(app: INestApplication, routes: Routes<T>): HttpRequest<T> {
  let auth: Auth;

  const http = {
    get auth() {
      if (!auth) throw new Error('User is not authorized');
      return auth;
    },
    close: app.close.bind(app),
    authorize(user, options) {
      if (!request) throw new Error('Server is not prepared');
      const token = options.jwt.sign({ id: user.id }, { expiresIn: '1h' });
      auth = { user, token };
    },
    unauthorize() {
      auth = null as any;
    },
  } as HttpRequest<T>;

  for (const [route, path] of Object.entries(routes)) {
    http[route as ExtractMethodName<T>] = new Proxy({} as any, {
      get(_target, method: HttpMethod) {
        const res = request(app.getHttpServer())[method](path as string);
        return auth ? res.auth(auth.token, { type: 'bearer' }) : res;
      },
    });
  }

  return http;
}

export type HttpServer<T> = {
  name: Routes<T>;
  request: HttpRequest<T>;
  prepare(app: INestApplication): void;
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
