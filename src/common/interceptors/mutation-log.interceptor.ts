import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, map } from 'rxjs';

import { LoggerService } from '@/customs/logger';
import { JwtAuthTokenService } from '@/modules/auth';
import { PrismaService } from '@/prisma';
import { guard } from '@/utils';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const EXCLUDE_PATHS = ['/event/', '/promises/queue'];

function redact(obj: Record<string, any>, keys: string[], mask = '[REDACTED]'): Record<string, any> {
  const newObj = { ...obj };
  for (const key of keys) {
    if (newObj[key]) Reflect.set(newObj, key, mask);
  }
  return newObj;
}

@Injectable()
export class MutationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly jwt: JwtAuthTokenService
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
      map(async (responseBody: any) => {
        let userId = null;
        userId ||= guard(() => this.jwt.verifyToken(responseBody.accessToken).sub, null);
        userId ||= guard(() => (request as any).user.id, null);
        if (!userId) return responseBody;

        await this.prisma.mutationLog
          .createMany({
            data: {
              userId,
              url: request.url,
              method: request.method,
              headers: redact(request.headers, ['authorization']),
              statusCode: response.statusCode,
              requestBody: Object.keys(request.body).length ? request.body : undefined,
              responseBody: Object.keys(responseBody).length
                ? redact(responseBody, ['accessToken', 'refreshToken'])
                : undefined,
              requestAt: requestTime,
              responseAt: new Date(),
            },
          })
          .catch((error) => this.logger.error(error));

        return responseBody;
      })
    );
  }
}
