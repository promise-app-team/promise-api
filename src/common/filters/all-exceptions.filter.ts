import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
  HttpServer,
  InternalServerErrorException,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapter: HttpServer) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const httpException =
      exception instanceof HttpException
        ? exception
        : new InternalServerErrorException('알 수 없는 오류가 발생했습니다.');

    if (typeof exception === 'string') {
      console.error('UnhandledException:', exception);
      console.trace();
    } else if (httpException.name === InternalServerErrorException.name) {
      console.error(httpException.cause || httpException);
    }
    this.httpAdapter.reply(ctx.getResponse(), httpException.getResponse(), httpException.getStatus());
  }
}
