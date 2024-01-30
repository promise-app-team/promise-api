import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    // const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const time = Date.now() - startTime;
      // const contentLength = res.get('content-length');

      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} \x1B[37m+${time}ms\x1B[39m`
      );
    });

    next();
  }
}
