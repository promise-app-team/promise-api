import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { LoggerService } from '@/customs/logger';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestedAt = Date.now();

    res.on('finish', () => {
      if (['/dev'].some((path) => req.baseUrl.startsWith(path))) return;
      this.logger.log(undefined, { request: req, response: res, ms: Date.now() - requestedAt }, 'HTTP');
    });

    next();
  }
}
