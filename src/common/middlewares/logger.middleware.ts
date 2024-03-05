import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestedAt = Date.now();

    res.on('finish', () => {
      this.logger.log('', {
        label: 'HTTP',
        request: req,
        response: res,
        ms: Date.now() - requestedAt,
      });
    });

    next();
  }
}
