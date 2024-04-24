import {
  Get as NestGet,
  Post as NestPost,
  Put as NestPut,
  Patch as NestPatch,
  Delete as NestDelete,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { Path, HttpAPIOptions } from '../types';

import { HttpException } from '@/common/exceptions';
import { ApiOperation, ApiResponse, UsableStatus } from '@/customs/swagger';
import { AuthGuard } from '@/modules/auth/auth.guard';

function Template(
  decorator: (path?: Path) => MethodDecorator,
  status: UsableStatus,
  path?: Path,
  options?: HttpAPIOptions
): MethodDecorator {
  const { auth, exceptions, response, interceptors, ...rest } = options || {};

  const toApplyDecorators = [decorator(path)];

  if (auth) {
    toApplyDecorators.push(AuthGuard());
    toApplyDecorators.push(ApiUnauthorizedResponse({ type: HttpException }));
  }

  if (response) {
    toApplyDecorators.push(ApiResponse([status, response]));
  }

  if (exceptions) {
    toApplyDecorators.push(ApiResponse(...exceptions));
  }

  if (interceptors) {
    toApplyDecorators.push(UseInterceptors(...interceptors));
  }

  toApplyDecorators.push(ApiOperation({ ...rest }));
  toApplyDecorators.push(ApiInternalServerErrorResponse({ type: HttpException }));

  return applyDecorators(...toApplyDecorators);
}

export const Get = (path?: Path, options?: HttpAPIOptions) => Template(NestGet, 'OK', path, options);
export const Post = (path?: Path, options?: HttpAPIOptions) => Template(NestPost, 'CREATED', path, options);
export const Put = (path?: Path, options?: HttpAPIOptions) => Template(NestPut, 'OK', path, options);
export const Patch = (path?: Path, options?: HttpAPIOptions) => Template(NestPatch, 'OK', path, options);
export const Delete = (path?: Path, options?: HttpAPIOptions) => Template(NestDelete, 'OK', path, options);
