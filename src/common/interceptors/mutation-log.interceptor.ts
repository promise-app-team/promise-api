import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { LoggerService } from '@/customs/logger';
import { PrismaService } from '@/prisma';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const EXCLUDE_PATHS = ['/event/', '/promises/queue'];
const REDACTED_FIELDS = ['accessToken', 'refreshToken'];

@Injectable()
export class MutationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly jwt: JwtService
  ) {
    logger.setContext(MutationLogInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): MaybePromise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const requestTime = new Date();

    if (!MUTATION_METHODS.includes(request.method)) {
      return next.handle();
    }

    if (EXCLUDE_PATHS.some((path) => request.url.includes(path))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        const resBody = { ...responseBody };
        const userId = (request as any)?.user?.id || +this.jwt.verify(resBody['accessToken']).id;
        if (!userId) return this.logger.warn('사용자 정보를 찾을 수 없습니다.');

        REDACTED_FIELDS.forEach((field) => {
          if (resBody[field]) resBody[field] = '[REDACTED]';
        });

        this.prisma.mutationLog
          .createMany({
            data: {
              userId,
              url: request.url,
              method: request.method,
              headers: request.headers,
              statusCode: response.statusCode,
              requestBody: Object.keys(request.body).length ? request.body : undefined,
              responseBody: Object.keys(resBody).length ? resBody : undefined,
              requestAt: requestTime,
              responseAt: new Date(),
            },
          })
          .catch((error) => this.logger.error(undefined, error));
      })
    );
  }
}
