import path from 'node:path';

import { compile } from 'path-to-regexp';
import * as R from 'remeda';
import request from 'supertest';

import type { JwtAuthTokenService } from '@/modules/auth';
import type { Methods } from '@/types';
import type { INestApplication } from '@nestjs/common';
import type { User } from '@prisma/client';

type HttpMethod = keyof Pick<request.SuperTest, 'get' | 'post' | 'put' | 'patch' | 'delete'>;
type Param = string | number | boolean | null | undefined;
type Route = string;

type OperatorName<T> = Methods<T>;

type RequestTestMap = Record<HttpMethod, request.Test>;

type Routes<T> = Record<OperatorName<T>, Route>;

type Auth = {
  user: User;
  token: string;
};

interface Operator {
  (params?: Record<string, Param>): RequestTestMap;
  toString(): string;
}

type HttpRequest<T> = Record<OperatorName<T>, Operator> & {
  auth: Auth;
  close: INestApplication['close'];
  authorize(user: User, options: { jwt: JwtAuthTokenService }): void;
  unauthorize(): void;
  prepare(app: INestApplication): void;
};

function createRequestInstance<T>(routes: Routes<T>): HttpRequest<T> {
  let app: INestApplication | null = null;
  let auth: Auth | null = null;

  const httpRequest = {
    get auth() {
      if (!auth) throw new Error('User is not authorized');
      return auth;
    },
    close() {
      app?.close();
    },
    authorize(user, options) {
      if (!app) throw new Error('Server is not prepared');
      const token = options.jwt.generateAccessToken({ sub: user.id });
      auth = { user, token };
    },
    unauthorize() {
      auth = null;
    },
    prepare(_app) {
      app = _app;
    },
  } as HttpRequest<T>;

  for (const [name, path] of R.entries(routes)) {
    function operator(params: Record<string, Param> = {}) {
      return new Proxy({} as RequestTestMap, {
        get(_target, method: HttpMethod) {
          if (!app) throw new Error('Server is not prepared');
          const res = request(app.getHttpServer())[method](compilePath(path, params));
          return auth ? res.auth(auth.token, { type: 'bearer' }) : res;
        },
      });
    }

    Object.defineProperty(operator, 'name', { value: `${path} (${name})` });
    Object.defineProperty(httpRequest, name, { value: operator });
  }

  return httpRequest;
}

export type HttpServer<T> = {
  request: HttpRequest<T>;
  prepare(app: INestApplication): void;
};

export function createHttpRequest<T>(prefix: string, routes: Routes<T>): HttpServer<T> {
  const normalizedRoutes = normalizeRoutes(prefix, routes);
  const request = createRequestInstance<T>(normalizedRoutes);

  return {
    request,
    prepare(app) {
      request.prepare(app);
    },
  };
}

function makePath(prefix?: string, ...paths: string[]) {
  return path.join('/', prefix ?? '/', ...paths).replace(/(?!.)\/$/g, '');
}

function normalizeRoutes<T>(prefix: string, routes: Routes<T>): Routes<T> {
  return R.mapValues(routes, (path) => makePath(prefix, path as string)) as Routes<T>;
}

function compilePath(path: string, params?: Record<string, Param>): string {
  const _params = R.pipe(
    params ?? {},
    R.entries(),
    R.filter(([_, value]) => !!value),
    R.map(([key, value]) => [key, `${value}`] as const),
    R.fromEntries()
  );
  return compile(path, { encode: encodeURIComponent })(_params);
}
