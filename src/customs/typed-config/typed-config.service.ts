import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FlattenObjectKeys, InferType } from './typed-config.type';

@Injectable()
export class TypedConfigServiceBuilder<EnvSchema extends Record<string, any>> {
  constructor(private readonly config: ConfigService) {}

  get<K extends FlattenObjectKeys<EnvSchema>>(path: K): InferType<EnvSchema, K> {
    return this.config.get(path) as InferType<EnvSchema, K>;
  }
}
