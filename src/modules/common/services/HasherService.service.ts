import { Injectable } from '@nestjs/common';
import { Hasher } from 'inthash';

@Injectable()
export class HasherService {
  private readonly hasher: Hasher;

  constructor() {
    this.hasher = new Hasher({
      bits: 53,
      prime: '7027677444274793',
      inverse: '5119353352861145',
      xor: '8722148419296618',
    });
  }

  encode(id: number | string): string {
    return this.hasher.encode(`${id}`);
  }

  decode(uid: number | string): string {
    return this.hasher.decode(`${uid}`);
  }
}
