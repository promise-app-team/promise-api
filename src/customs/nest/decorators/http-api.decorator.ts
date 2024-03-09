import {
  Get as NestGet,
  Post as NestPost,
  Put as NestPut,
  Patch as NestPatch,
  Delete as NestDelete,
} from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { HttpException } from '@/common';
import { Path, HttpApiOptions } from '@/customs/nest/types';
import { ApiOperation, ApiResponse } from '@/customs/swagger';
import { AuthGuard } from '@/modules/auth/auth.guard';

function Template(
  decorator: (path?: Path) => MethodDecorator,
  path?: Path,
  options?: Partial<HttpApiOptions>
): MethodDecorator {
  return (...args) => {
    const { auth, exceptions, ...rest } = options || {};

    if (auth) {
      AuthGuard()(...args);
      ApiUnauthorizedResponse({ type: HttpException })(...args);
    }

    if (exceptions) {
      ApiResponse(...exceptions)(...args);
    }

    ApiOperation({ ...rest })(...args);
    ApiInternalServerErrorResponse({ type: HttpException })(...args);

    decorator(path)(...args);
  };
}

export const Get = (path?: Path, options?: Partial<HttpApiOptions>) => Template(NestGet, path, options);
export const Post = (path?: Path, options?: Partial<HttpApiOptions>) => Template(NestPost, path, options);
export const Put = (path?: Path, options?: Partial<HttpApiOptions>) => Template(NestPut, path, options);
export const Patch = (path?: Path, options?: Partial<HttpApiOptions>) => Template(NestPatch, path, options);
export const Delete = (path?: Path, options?: Partial<HttpApiOptions>) => Template(NestDelete, path, options);
