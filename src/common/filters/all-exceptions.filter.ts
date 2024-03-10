import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ExceptionFilter,
  HttpServer,
  InternalServerErrorException,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapter: HttpServer) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const isHttpException = exception instanceof HttpException;

    const httpStatus = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const httpException = isHttpException
      ? exception
      : new InternalServerErrorException(`알 수 없는 오류가 발생했습니다.`);

    if (httpException.name === InternalServerErrorException.name) {
      console.error(httpException.cause || httpException);
    }
    this.httpAdapter.reply(ctx.getResponse(), httpException.getResponse(), httpStatus);
  }
}
