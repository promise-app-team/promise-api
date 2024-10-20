import { HttpStatus } from '@nestjs/common'
import { ApiResponse as BaseApiResponse } from '@nestjs/swagger'
import { unique } from 'remeda'

import { HttpException, isExceptionStatus } from '@/common/exceptions'

import type { Type } from '@nestjs/common'

export type UsableStatus = Extract<
  keyof typeof HttpStatus,
  | /* 200 */ 'OK'
  | /* 201 */ 'CREATED'
  | /* 204 */ 'NO_CONTENT'
  | /* 400 */ 'BAD_REQUEST'
  | /* 401 */ 'UNAUTHORIZED'
  | /* 403 */ 'FORBIDDEN'
  | /* 404 */ 'NOT_FOUND'
  | /* 409 */ 'CONFLICT'
  | /* 500 */ 'INTERNAL_SERVER_ERROR'
>

type StatusArgs = [UsableStatus, Type<unknown> | [Type<unknown>]] | UsableStatus

export function ApiResponse(...args: StatusArgs[]): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    for (const argument of unique(args)) {
      const [status, type] = Array.isArray(argument) ? argument : [argument, undefined]
      BaseApiResponse({
        status: HttpStatus[status],
        type: isExceptionStatus(status) ? HttpException : type,
      })(target, propertyKey, descriptor)
    }
  }
}
