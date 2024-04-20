import { ArgumentsHost, Catch, ExceptionFilter, HttpServer, InternalServerErrorException } from '@nestjs/common';

import { HttpException } from '../exceptions/http.exception';

import { TypedConfigService } from '@/config/env';

function isHttpException(exception: any): exception is HttpException {
  try {
    return ['message', 'error', 'statusCode'].every((key) => key in exception.response);
  } catch {
    return false;
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapter: HttpServer,
    private readonly config: TypedConfigService
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const httpException = isHttpException(exception)
      ? exception
      : HttpException.new('알 수 없는 오류가 발생했습니다.', 'INTERNAL_SERVER_ERROR', exception);

    if (this.config.get('is.test')) {
    } else if (typeof exception === 'string') {
      console.error('UnhandledException:', exception);
      console.trace();
    } else if (httpException.name === InternalServerErrorException.name) {
      console.error(httpException.cause || httpException);
    }

    this.httpAdapter.reply(ctx.getResponse(), httpException.getResponse(), httpException.getStatus());
  }
}
