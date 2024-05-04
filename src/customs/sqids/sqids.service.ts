import { Injectable } from '@nestjs/common';
import Sqids from 'sqids';

import { SqidsOptions } from './sqids.interface';

@Injectable()
export class SqidsService {
  private readonly sqids: Sqids;

  constructor(private readonly options?: SqidsOptions) {
    this.sqids = new Sqids(this.options);
  }

  encode(ids: number[]): string;
  encode(...ids: number[]): string;
  encode(...args: any[]): string {
    return this.sqids.encode(Array.isArray(args[0]) ? args[0] : args);
  }

  decode(uid: string): number[] {
    return this.sqids.decode(uid);
  }
}
