import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';
import type { HasherOptions } from 'inthash';
import type { Simplify } from 'type-fest';

interface InternalIntHashModuleOptions extends HasherOptions {}
interface InternalIntHashModuleAsyncOptions extends BaseFactoryProvider<InternalIntHashModuleOptions> {}

export type IntHashModuleOptions = Simplify<InternalIntHashModuleOptions & BaseModuleOptions>;
export type IntHashModuleAsyncOptions = Simplify<InternalIntHashModuleAsyncOptions & BaseModuleOptions>;
