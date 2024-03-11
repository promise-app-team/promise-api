import { Injectable } from '@nestjs/common';
import { Hasher } from 'inthash';

@Injectable()
export class InthashService {
  constructor(private readonly hasher: Hasher) {}

  encode(id: number | string): string {
    return this.hasher.encode(`${id}`);
  }

  decode(uid: number | string): string {
    return this.hasher.decode(`${uid}`);
  }
}
