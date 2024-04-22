import path from 'node:path';

import { INestApplication } from '@nestjs/common';
import { User } from '@prisma/client';
import { compile } from 'path-to-regexp';
import { mapValues } from 'remeda';
import request from 'supertest';

import { JwtAuthTokenService } from '@/modules/auth';
import { Methods } from '@/types';

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
  authorize(token: string): void;
  authorize<U extends User>(user: U, options: { jwt: JwtAuthTokenService }): void;
  unauthorize(): void;
};

function initializeHttpRequest<T>(app: INestApplication | null, routes: Routes<T>): HttpRequest<T> {
  let auth: Auth;

  const httpRequest = {
    get auth() {
      if (!auth) throw new Error('User is not authorized');
      return auth;
    },
    close() {
      app?.close();
    },
    authorize(user, options) {
      if (!request) throw new Error('Server is not prepared');
      const token = options.jwt.generateAccessToken({ sub: user.id });
      auth = { user, token };
    },
    unauthorize() {
      auth = null as any;
    },
  } as HttpRequest<T>;

  for (const [name, path] of Object.entries(routes)) {
    function operator(params: Record<string, Param> = {}) {
      return new Proxy({} as RequestTestMap, {
        get(_target, method: HttpMethod) {
          if (!app) throw new Error('Server is not prepared');
          const res = request(app.getHttpServer())[method](compilePath(path as string, params));
          return auth ? res.auth(auth.token, { type: 'bearer' }) : res;
        },
      });
    }

    Object.defineProperty(operator, 'name', { value: `${path} (${name})` });
    Object.assign(httpRequest, { [name]: operator });
  }

  return httpRequest;
}

export type HttpServer<T> = {
  request: HttpRequest<T>;
  prepare(app: INestApplication): void;
};

export function createHttpRequest<T>(prefix: string, routes: Routes<T>): HttpServer<T> {
  const normalizedRoutes = normalizeRoutes(prefix, routes);

  let request = initializeHttpRequest<T>(null, normalizedRoutes);

  return {
    get request() {
      return request;
    },
    prepare(app: INestApplication) {
      request = initializeHttpRequest<T>(app, normalizedRoutes);
    },
  };
}

function makePath(prefix?: string, ...paths: string[]) {
  return path.join('/', prefix ?? '/', ...paths).replace(/(?!.)\/$/g, '');
}

function normalizeRoutes<T>(prefix: string, routes: Routes<T>): Routes<T> {
  return mapValues(routes, (path) => makePath(prefix, path)) as Routes<T>;
}

function compilePath(path: string, params?: Record<string, Param>): string {
  return compile(path, { encode: encodeURIComponent })(params);
}
