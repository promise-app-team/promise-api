import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Get, Paths } from 'type-fest';

@Injectable()
export class TypedConfigServiceBuilder<EnvSchema extends Record<string, any>> {
  constructor(private readonly config: ConfigService) {}

  get<K extends Paths<EnvSchema>>(path: K): Get<EnvSchema, Exclude<K, number>> {
    return this.config.get(`${path}`) as Get<EnvSchema, Exclude<K, number>>;
  }
}
