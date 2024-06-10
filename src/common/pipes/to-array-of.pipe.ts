import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import * as R from 'remeda';

@Injectable()
export class ToArrayOfPipe<T> implements PipeTransform<any, T[]> {
  constructor(
    private readonly type: (value: any) => T,
    private readonly options?: { unique?: boolean }
  ) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const unique = this.options?.unique ?? false;

    return R.pipe(
      R.isArray(value) ? value : [value],
      R.map((v) => this.type(v)),
      R.filter(R.isTruthy),
      unique ? R.unique() : R.identity()
    );
  }
}
