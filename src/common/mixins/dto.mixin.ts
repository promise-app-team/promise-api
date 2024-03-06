import { Constructor } from '@/types';

type Transform<T> = (obj: any, dto: T) => T | Record<string, any>;

export function ApplyDTO<T extends Constructor>(Base: T, transform: Transform<T>) {
  return class DTO extends Base {
    static from(obj: any): DTO;
    static from(obj: any | null): DTO | null {
      if (obj === null) {
        return null;
      }

      const dto = new DTO();
      const result = transform(obj, dto);

      if (result instanceof DTO) {
        return result;
      }

      return Object.assign(dto, result);
    }
  };
}
