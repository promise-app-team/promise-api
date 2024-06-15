import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as R from 'remeda';

@Injectable()
export class TrimMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.body = this.transform(req.body);
    next();
  }

  private transform(data: any): any {
    return R.conditional(
      data,
      [R.isString, (data) => data.trim()],
      [R.isArray, R.map(this.transform.bind(this))],
      [R.isPlainObject, R.mapValues(this.transform.bind(this))],
      R.conditional.defaultCase(R.identity())
    );
  }
}
