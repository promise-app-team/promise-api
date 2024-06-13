import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Get, Paths } from 'type-fest';

export function TypedConfigServiceBuilder<EnvSchema extends Record<string, any>>(factory: () => EnvSchema) {
  @Injectable()
  class TypedConfigService<EnvSchema extends Record<string, any>> {
    constructor(private readonly config: ConfigService) {}

    get<K extends Paths<EnvSchema>>(path: K): Get<EnvSchema, Exclude<K, number>> {
      return this.config.get(`${path}`) as Get<EnvSchema, Exclude<K, number>>;
    }
  }
  Reflect.defineMetadata(`${TypedConfigService.name}:factory`, factory, TypedConfigService);
  return TypedConfigService<EnvSchema>;
}
