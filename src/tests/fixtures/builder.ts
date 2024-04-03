import { isDate, isValid } from 'date-fns';
import { mapValues } from 'remeda';

export interface Result<Input, Output = Input> {
  input: Input;
  output: Output;
}

type Param<T extends Record<string, any>, R extends keyof T = never> = [R] extends [never]
  ? Partial<T>
  : Partial<T> & Required<Pick<T, R>>;

interface RequiredModuleBuilder<T extends Record<string, any>, R extends keyof T, P = Param<T, R>> {
  (partial: P): T;
  <U>(partial: P, transform?: (result: T) => Promise<U>): Promise<Result<T, U>>;
  <U>(partial: P, transform?: (result: T) => U): Result<T, U>;
}

interface OptionalModuleBuilder<T extends Record<string, any>, P = Param<T>> {
  (partial?: P): T;
  <U>(transform?: (result: T) => Promise<U>): Promise<Result<T, U>>;
  <U>(transform?: (result: T) => U): Result<T, U>;
  <U>(partial?: P, transform?: (result: T) => Promise<U>): Promise<Result<T, U>>;
  <U>(partial?: P, transform?: (result: T) => U): Result<T, U>;
}

export type ModelBuilder<T extends Record<string, any>, R extends keyof T = never> = [R] extends [never]
  ? OptionalModuleBuilder<T>
  : RequiredModuleBuilder<T, R>;

export function createModelBuilder<T extends Record<string, any>, R extends keyof T = never>(
  initialId: number,
  defaultValue: (id: number) => T
): ModelBuilder<T, R> {
  const builder: any = (partial: any, transform: any) => {
    if (typeof partial === 'function') {
      return builder(undefined, partial);
    }

    const result = mapValues(
      {
        ...defaultValue(partial?.id ?? ++initialId),
        ...partial,
      },
      (value: any) => {
        if (isDate(value) && isValid(value)) {
          value.setMilliseconds(0);
          return value;
        }

        return value;
      }
    ) as T;

    if (typeof transform === 'undefined') {
      return result;
    }

    const input = { ...result };
    const output = transform(result);

    if (isPromiseLike(output)) {
      return output.then((output) => ({ input, output }));
    }

    return { input, output };
  };

  return builder as ModelBuilder<T, R>;
}

export function isResult<T extends Record<string, any>>(value: any): value is Result<T> {
  return value && typeof value === 'object' && 'input' in value && 'output' in value;
}

function isPromiseLike(value: any): value is Promise<any> {
  return value && typeof value.then === 'function';
}
