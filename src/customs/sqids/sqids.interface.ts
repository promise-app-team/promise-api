import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';
import type Sqids from 'sqids';
import type { Simplify } from 'type-fest';

export type SqidsOptions = NonNullable<ConstructorParameters<typeof Sqids>[0]>;

interface InternalSqidsModuleOptions extends SqidsOptions {}
interface InternalSqidsModuleAsyncOptions extends BaseFactoryProvider<InternalSqidsModuleOptions> {}

export type SqidsModuleOptions = Simplify<InternalSqidsModuleOptions & BaseModuleOptions>;
export type SqidsModuleAsyncOptions = Simplify<InternalSqidsModuleAsyncOptions & BaseModuleOptions>;
