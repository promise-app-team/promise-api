import { ArgumentsHost, Catch, ExceptionFilter, HttpServer } from '@nestjs/common'

import { LoggerService } from '@/customs/logger'

import { HttpException } from '../exceptions/http.exception'

function isHttpException(exception: any): exception is HttpException {
  try {
    return ['message', 'error', 'statusCode'].every(key => key in exception.response)
  }
  catch {
    return false
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapter: HttpServer,
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()

    const httpException = isHttpException(exception)
      ? exception
      : HttpException.new('알 수 없는 오류가 발생했습니다.', 'INTERNAL_SERVER_ERROR', exception)

    if (typeof exception === 'string') {
      this.logger.error(undefined, exception, 'UnhandledException')
    }
    else {
      this.logger.warn(undefined, { error: httpException.cause || httpException.message }, 'Exception')
    }

    this.httpAdapter.reply(ctx.getResponse(), httpException.getResponse(), httpException.getStatus())
  }
}
