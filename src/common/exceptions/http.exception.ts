import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException as NestHttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Type,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'

export type Status = keyof typeof HttpStatus
export type StatusCode = (typeof HttpStatus)[Status]

export type ExceptionStatus = Extract<
  keyof typeof HttpStatus,
  | /* 400 */ 'BAD_REQUEST'
  | /* 401 */ 'UNAUTHORIZED'
  | /* 403 */ 'FORBIDDEN'
  | /* 404 */ 'NOT_FOUND'
  | /* 409 */ 'CONFLICT'
  | /* 500 */ 'INTERNAL_SERVER_ERROR'
>

type ExceptionMap = Record<ExceptionStatus, Type<NestHttpException>>

const exceptionMap: ExceptionMap = {
  CONFLICT: ConflictException,
  NOT_FOUND: NotFoundException,
  FORBIDDEN: ForbiddenException,
  BAD_REQUEST: BadRequestException,
  UNAUTHORIZED: UnauthorizedException,
  INTERNAL_SERVER_ERROR: InternalServerErrorException,
}

export function isExceptionStatus(status: string): status is ExceptionStatus {
  return status in exceptionMap
}

export class HttpException extends NestHttpException {
  @ApiProperty({ example: 'message' })
  message!: string

  @ApiProperty({ example: 'status message' })
  error!: string

  @ApiProperty({ example: 'status code' })
  statusCode!: number

  constructor(message: string, status: ExceptionStatus, cause?: unknown)
  constructor(args: { message: string, status: ExceptionStatus, cause?: unknown })
  constructor(
    args: string | { message: string, status: ExceptionStatus, cause?: unknown },
    status?: ExceptionStatus,
    cause?: unknown,
  ) {
    const input = typeof args === 'string' ? { message: args, status, cause } : args
    super(input.message, input.status ? HttpStatus[input.status] : HttpStatus.INTERNAL_SERVER_ERROR)
    const exception = new exceptionMap[input.status ?? 'INTERNAL_SERVER_ERROR'](input.message)
    exception.cause = input.cause
    Object.assign(this, exception)
  }

  static new(error: NestHttpException | Error | string, status?: ExceptionStatus, cause?: unknown): NestHttpException
  static new(error: { message: string, status: ExceptionStatus, cause?: unknown }): NestHttpException
  static new(error: any, status: ExceptionStatus = 'INTERNAL_SERVER_ERROR', cause?: unknown): NestHttpException {
    if (error instanceof NestHttpException) {
      return error
    }
    if (error instanceof Error) {
      return new HttpException(error.message, status, error)
    }
    const input = typeof error === 'string' ? { message: error, status, cause } : error
    return new HttpException(input.message, input.status, input.cause)
  }

  static throw(error: NestHttpException | Error | string, status?: ExceptionStatus, cause?: unknown): never
  static throw(error: { message: string, status: ExceptionStatus, cause?: unknown }): never
  static throw(error: any, status: ExceptionStatus = 'INTERNAL_SERVER_ERROR', cause?: unknown): never {
    throw HttpException.new(error, status, cause)
  }
}
