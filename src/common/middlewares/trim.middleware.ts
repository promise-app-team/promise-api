import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TrimMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.body = this.transform(req.body);
    next();
  }

  private transform(data: any): any {
    if (typeof data === 'string') {
      return data.trim();
    } else if (Array.isArray(data)) {
      return data.map(this.transform.bind(this));
    } else if (typeof data === 'object') {
      for (const key in data) {
        if (!data.hasOwnProperty(key)) continue;
        data[key] = this.transform(data[key]);
      }
    }
    return data;
  }
}
