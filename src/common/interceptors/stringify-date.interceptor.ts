import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { formatISO, isValid } from 'date-fns'
import * as R from 'remeda'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Injectable()
export class StringifyDateInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(this.transform.bind(this)))
  }

  private transform(data: any): any {
    const result = R.conditional(
      data,
      [R.isNumber, R.identity()],
      [isValid, formatISO],
      [R.isArray, R.map(this.transform.bind(this))],
      [R.isObjectType, R.mapValues(this.transform.bind(this))],
      R.conditional.defaultCase(R.identity()),
    )
    return result
  }
}
