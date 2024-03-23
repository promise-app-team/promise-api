import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import * as R from 'remeda';

@Injectable()
export class ToArrayOfPipe<T> implements PipeTransform<any, T[]> {
  constructor(
    private readonly type: (value: any) => T,
    private readonly options?: { unique?: boolean }
  ) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    return R.pipe(
      R.isArray(value) ? value : [value],
      R.map((v) => this.type(v)),
      R.filter(R.isTruthy),
      this.options?.unique ?? false ? R.uniq() : R.identity
    );
  }
}
