import type { Type } from '@nestjs/common';
import type { ConfigModuleOptions } from '@nestjs/config';

export interface TypedConfigModuleOptions extends ConfigModuleOptions {
  config: Type;
}
