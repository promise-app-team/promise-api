import { HasherOptions } from 'inthash';

import { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';

interface _IntHashModuleOptions extends HasherOptions {}

interface _IntHashModuleAsyncOptions extends BaseFactoryProvider<_IntHashModuleOptions> {}

export type IntHashModuleOptions = _IntHashModuleOptions & BaseModuleOptions;
export type IntHashModuleAsyncOptions = _IntHashModuleAsyncOptions & BaseModuleOptions;
