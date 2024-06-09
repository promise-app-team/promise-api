import type { FactoryProvider } from '@nestjs/common';

export interface BaseModuleOptions {
  scope?: Scope;
  isGlobal?: boolean;
}

export interface BaseFactoryProvider<T> extends Pick<FactoryProvider<T>, 'inject' | 'useFactory'> {}
