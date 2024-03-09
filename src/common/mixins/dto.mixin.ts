import { Type } from '@nestjs/common';
import { PickType } from '@nestjs/swagger';
import { pick } from 'remeda';

export function ApplyDTO<T, K extends keyof T, A extends Record<string, any>>(
  classRef: Type<T>,
  keys: readonly K[],
  extend?: (obj: T) => A
): Type<Pick<T, (typeof keys)[number]>> & {
  from(obj: Record<string, any>): Pick<T, (typeof keys)[number]> & A;
} {
  return class DTO extends (PickType(classRef, keys) as Type) {
    static from(obj: any) {
      if (!obj) throw new Error('obj is missing');

      const dto = new DTO();
      const picked = pick(obj, keys);
      const extended = extend?.(obj) ?? {};
      return Object.assign(dto, picked, extended);
    }
  } as any;
}
