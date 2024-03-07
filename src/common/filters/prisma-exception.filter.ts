import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

import { HttpException } from '@/schema/exception';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2003':
      case 'P2025':
        response.status(404).json(
          new HttpException({
            error: '항목을 찾을 수 없습니다.',
            message: 'Not Found',
            statusCode: 404,
          })
        );
        break;

      default:
        console.error(`Unhandled PrismaExceptionFilter: ${exception.message} ${exception.code}`);
        super.catch(exception, host);
        break;
    }
  }
}
