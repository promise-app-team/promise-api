import {
  HttpStatus,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException as NestHttpException,
} from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { Constructor } from '@/types';

export type Status = keyof typeof HttpStatus;
export type StatusCode = (typeof HttpStatus)[Status];

type ExceptionStatus =
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'INTERNAL_SERVER_ERROR';

type ExceptionMap = Record<ExceptionStatus, Constructor<NestHttpException>>;

const exceptionMap: ExceptionMap = {
  CONFLICT: ConflictException,
  NOT_FOUND: NotFoundException,
  FORBIDDEN: ForbiddenException,
  BAD_REQUEST: BadRequestException,
  UNAUTHORIZED: UnauthorizedException,
  INTERNAL_SERVER_ERROR: InternalServerErrorException,
};

export class HttpException extends NestHttpException {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  error!: string;

  @ApiProperty()
  statusCode!: number;

  constructor(message: string, status: ExceptionStatus, cause?: unknown);
  constructor(args: { message: string; status: ExceptionStatus; cause?: unknown });
  constructor(
    args: string | { message: string; status: ExceptionStatus; cause?: unknown },
    status?: ExceptionStatus,
    cause?: unknown
  ) {
    const input = typeof args === 'string' ? { message: args, status, cause } : args;
    super(input.message, input.status ? HttpStatus[input.status] : HttpStatus.INTERNAL_SERVER_ERROR);
    Object.assign(this, new exceptionMap[input.status ?? 'INTERNAL_SERVER_ERROR'](input.message));
  }

  static throw(error: Error | HttpException): never;
  static throw(message: string, status: ExceptionStatus, cause?: unknown): never;
  static throw(args: { message: string; status: ExceptionStatus; cause?: unknown }): never;
  static throw(
    error: Error | string | { message: string; status: ExceptionStatus; cause?: unknown },
    status?: ExceptionStatus,
    cause?: unknown
  ): never {
    if (error instanceof NestHttpException) {
      throw error;
    }
    if (error instanceof Error) {
      throw new HttpException(error.message, 'INTERNAL_SERVER_ERROR', error);
    }
    const input = typeof error === 'string' ? { message: error, status, cause } : error;
    throw new HttpException(input.message, input.status ?? 'INTERNAL_SERVER_ERROR', input.cause);
  }

  static catch(error: any): never {
    if (error instanceof NestHttpException) throw error;
    throw HttpException.throw('알 수 없는 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', error);
  }
}
