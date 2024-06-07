import * as nest from '@nestjs/common';
import * as swagger from '@nestjs/swagger';
import { ApiInternalServerErrorResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { Path, HttpAPIOptions } from '../types';

import { HttpException } from '@/common/exceptions';
import { ApiOperation, ApiResponse, UsableStatus } from '@/customs/swagger';
import { AuthGuard } from '@/modules/auth/auth.guard';

function template(
  decorator: (path?: Path) => MethodDecorator,
  status: UsableStatus,
  path?: Path,
  options?: HttpAPIOptions
): MethodDecorator {
  const { hidden, auth, render, exceptions, response, interceptors, ...rest } = options || {};

  const toApplyDecorators = [decorator(path)];

  if (hidden) {
    toApplyDecorators.push(swagger.ApiExcludeEndpoint());
  }

  if (render) {
    toApplyDecorators.push(nest.Render(render));
  }

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
    toApplyDecorators.push(nest.UseInterceptors(...interceptors));
  }

  toApplyDecorators.push(ApiOperation({ ...rest }));
  toApplyDecorators.push(ApiInternalServerErrorResponse({ type: HttpException }));

  return nest.applyDecorators(...toApplyDecorators);
}

type HttpMethodDecorator = (path?: Path, options?: HttpAPIOptions) => MethodDecorator;
export const Get: HttpMethodDecorator = (...args) => template(nest.Get, 'OK', ...args);
export const Post: HttpMethodDecorator = (...args) => template(nest.Post, 'CREATED', ...args);
export const Put: HttpMethodDecorator = (...args) => template(nest.Put, 'OK', ...args);
export const Patch: HttpMethodDecorator = (...args) => template(nest.Patch, 'OK', ...args);
export const Delete: HttpMethodDecorator = (...args) => template(nest.Delete, 'OK', ...args);
