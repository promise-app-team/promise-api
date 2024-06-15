import type { TypedConfigServiceBuilder } from './typed-config.service';
import type { BaseModuleOptions } from '@/types/nest';
import type { ConfigModuleOptions } from '@nestjs/config';
import type { Simplify } from 'type-fest';

interface InternalTypedConfigModuleOptions {
  provider: ReturnType<typeof TypedConfigServiceBuilder>;
  options: Omit<ConfigModuleOptions, 'isGlobal' | 'load'>;
}

export type TypedConfigModuleOptions = Simplify<InternalTypedConfigModuleOptions & BaseModuleOptions>;
