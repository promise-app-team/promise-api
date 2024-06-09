import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';
import type { HasherOptions } from 'inthash';

interface _IntHashModuleOptions extends HasherOptions {}

interface _IntHashModuleAsyncOptions extends BaseFactoryProvider<_IntHashModuleOptions> {}

export type IntHashModuleOptions = _IntHashModuleOptions & BaseModuleOptions;
export type IntHashModuleAsyncOptions = _IntHashModuleAsyncOptions & BaseModuleOptions;
