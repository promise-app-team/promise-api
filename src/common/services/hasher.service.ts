import { Injectable } from '@nestjs/common';
import { Hasher } from 'inthash';

import { TypedConfigService } from '@/common/services/typed-config.service';

@Injectable()
export class HasherService {
  private readonly hasher: Hasher;

  constructor(private readonly config: TypedConfigService) {
    this.hasher = new Hasher({
      bits: config.get('inthash.bits'),
      prime: config.get('inthash.prime'),
      inverse: config.get('inthash.inverse'),
      xor: config.get('inthash.xor'),
    });
  }

  encode(id: number | string): string {
    return this.hasher.encode(`${id}`);
  }

  decode(uid: number | string): string {
    return this.hasher.decode(`${uid}`);
  }
}
