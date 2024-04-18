import {
  Get as NestGet,
  Post as NestPost,
  Put as NestPut,
  Patch as NestPatch,
  Delete as NestDelete,
  UseInterceptors,
} from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { Path, HttpAPIOptions } from '../types';

import { HttpException } from '@/common/exceptions/http.exception';
import { ApiOperation } from '@/customs/swagger/decorators/api-operation.decorator';
import { ApiResponse, UsableStatus } from '@/customs/swagger/decorators/api-response.decorator';
import { AuthGuard } from '@/modules/auth/auth.guard';

function Template(
  decorator: (path?: Path) => MethodDecorator,
  status: UsableStatus,
  path?: Path,
  options?: HttpAPIOptions
): MethodDecorator {
  return (...args) => {
    const { auth, exceptions, response, interceptors, ...rest } = options || {};

    if (auth) {
      AuthGuard()(...args);
      ApiUnauthorizedResponse({ type: HttpException })(...args);
    }

    if (response) {
      ApiResponse([status, response])(...args);
    }

    if (exceptions) {
      ApiResponse(...exceptions)(...args);
    }

    ApiOperation({ ...rest })(...args);
    ApiInternalServerErrorResponse({ type: HttpException })(...args);

    decorator(path)(...args);

    if (interceptors) {
      UseInterceptors(...interceptors)(...args);
    }
  };
}

export const Get = (path?: Path, options?: HttpAPIOptions) => Template(NestGet, 'OK', path, options);
export const Post = (path?: Path, options?: HttpAPIOptions) => Template(NestPost, 'CREATED', path, options);
export const Put = (path?: Path, options?: HttpAPIOptions) => Template(NestPut, 'OK', path, options);
export const Patch = (path?: Path, options?: HttpAPIOptions) => Template(NestPatch, 'OK', path, options);
export const Delete = (path?: Path, options?: HttpAPIOptions) => Template(NestDelete, 'OK', path, options);
