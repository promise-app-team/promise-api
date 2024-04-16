type Expect<T extends true> = T;
type ExpectTrue<T extends true> = T;
type ExpectFalse<T extends false> = T;

type IsTrue<T> = T extends true ? true : false;
type IsFalse<T> = T extends false ? true : false;

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true;

// https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
type IsAny<T> = 0 extends 1 & T ? true : false;
type NotAny<T> = true extends IsAny<T> ? false : true;

type IsUndefined<T> = undefined extends T ? true : false;
type IsUnknown<T> = IsAny<T> extends true ? never : unknown extends T ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;

type Debug<T> = { [K in keyof T]: T[K] };
type MergeInsertions<T> = T extends object ? { [K in keyof T]: MergeInsertions<T[K]> } : T;

type Alike<X, Y> = Equal<MergeInsertions<X>, MergeInsertions<Y>>;

type ExpectExtends<VALUE, EXPECTED> = EXPECTED extends VALUE ? true : false;
type ExpectValidArgs<FUNC extends (...args: any[]) => any, ARGS extends any[]> =
  ARGS extends Parameters<FUNC> ? true : false;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type Builtins = string | number | boolean | undefined | null | Function | Date | Error | RegExp;
type Literal<T> = T extends Builtins ? T : T extends object ? { [K in keyof T]: Literal<T[K]> } : T;

// eslint-disable-next-line prettier/prettier
type And<A extends boolean, B extends boolean, C extends boolean = true, D extends boolean = true> =
  A extends true ? B extends true ? C extends true ? D extends true ? true : false : false : false : false;

// eslint-disable-next-line prettier/prettier
type Or<A extends boolean, B extends boolean, C extends boolean = false, D extends boolean = false> = 
  A extends true ? true : B extends true ? true : C extends true ? true : D extends true ? true : false;
