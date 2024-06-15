import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { formatISO, isValid, toDate } from 'date-fns';
import * as R from 'remeda';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class StringifyDateInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(this.transform.bind(this)));
  }

  private transform(data: any): any {
    const result = R.conditional(
      data,
      [R.isNumber, R.identity()],
      [(d) => isValid(toDate(d)), formatISO],
      [R.isArray, R.map(this.transform.bind(this))],
      [R.isPlainObject, R.mapValues(this.transform.bind(this))],
      R.conditional.defaultCase(R.identity())
    );
    return result;
  }
}
