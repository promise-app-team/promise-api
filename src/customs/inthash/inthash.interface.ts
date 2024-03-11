import { HasherOptions } from 'inthash';

export interface IntHashModuleOptions extends HasherOptions {}

export interface IntHashModuleAsyncOptions {
  isGlobal?: boolean;
  inject?: any[];
  useFactory: (...args: any[]) => IntHashModuleOptions | Promise<IntHashModuleOptions>;
}
