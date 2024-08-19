import { Injectable } from '@nestjs/common';
import { Hasher, HasherOptions } from 'inthash';

@Injectable()
export class IntHashService {
  private readonly hasher: Hasher;

  constructor(options: HasherOptions) {
    this.hasher = new Hasher(options);
  }

  encode(id: number | string): string {
    return this.hasher.encode(`${id}`);
  }

  decode(uid: number | string): string {
    return this.hasher.decode(`${uid}`);
  }
}
