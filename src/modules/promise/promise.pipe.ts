import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { InthashService } from '@/customs/inthash/inthash.service';

@Injectable()
export class DecodePromisePID implements PipeTransform {
  constructor(private readonly hasher: InthashService) {}

  transform(value: any, _metadata?: ArgumentMetadata) {
    return +this.hasher.decode(value);
  }
}
