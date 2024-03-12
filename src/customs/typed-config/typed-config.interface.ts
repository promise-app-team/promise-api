import { Type } from '@nestjs/common';
import { ConfigModuleOptions } from '@nestjs/config';

export interface TypedConfigModuleOptions extends ConfigModuleOptions {
  config: Type;
}
