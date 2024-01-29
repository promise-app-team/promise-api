import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TrimMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.body = this.trimObjectStrings(req.body);
    next();
  }

  private trimObjectStrings(obj: any): any {
    if (typeof obj === 'string') {
      return obj.trim();
    } else if (Array.isArray(obj)) {
      return obj.map(this.trimObjectStrings);
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        obj[key] = this.trimObjectStrings(obj[key]);
      }
    }
    return obj;
  }
}
