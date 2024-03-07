import { Constructor } from '@/types';

type Transform<T> = (obj: any, dto: T) => T | Record<string, any>;

export function ApplyDTO<T extends Constructor>(Base: T, transform: Transform<T>) {
  return class DTO extends Base {
    static from(obj: any): DTO {
      if (!obj) throw new Error('obj is missing');

      const dto = new DTO();
      const result = transform(obj, dto);

      if (result instanceof DTO) {
        return result;
      }

      return Object.assign(dto, result);
    }
  };
}
