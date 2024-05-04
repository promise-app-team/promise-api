import Sqids from 'sqids';

import { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';

export type SqidsOptions = NonNullable<ConstructorParameters<typeof Sqids>[0]>;

interface _SqidsModuleOptions extends SqidsOptions {}

interface _SqidsModuleAsyncOptions extends BaseFactoryProvider<_SqidsModuleOptions> {}

export type SqidsModuleOptions = _SqidsModuleOptions & BaseModuleOptions;
export type SqidsModuleAsyncOptions = _SqidsModuleAsyncOptions & BaseModuleOptions;
