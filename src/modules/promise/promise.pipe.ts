import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { IntHashService } from '@/customs/inthash';

@Injectable()
export class DecodePromisePID implements PipeTransform {
  constructor(private readonly hasher: IntHashService) {}

  transform(value: any, _metadata?: ArgumentMetadata) {
    return +this.hasher.decode(value);
  }
}
