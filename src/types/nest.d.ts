import type { FactoryProvider, Scope } from '@nestjs/common';

export interface BaseModuleOptions {
  scope?: Scope;
  global?: boolean;
}

export interface BaseFactoryProvider<T> extends Pick<FactoryProvider<T>, 'inject' | 'useFactory'> {}
