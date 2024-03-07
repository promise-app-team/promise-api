import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { formatISO } from 'date-fns';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class StringifyDateInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(this.transform.bind(this)));
  }

  private transform(data: any): any {
    if (data instanceof Date) {
      return formatISO(data);
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
