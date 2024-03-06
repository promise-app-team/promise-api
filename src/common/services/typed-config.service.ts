import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EnvSchema } from '@/common/config/env';
import { FlattenObjectKeys, InferType } from '@/types';

@Injectable()
export class TypedConfigService {
  constructor(private readonly config: ConfigService) {}

  get<K extends FlattenObjectKeys<EnvSchema>>(path: K): InferType<EnvSchema, K> {
    return this.config.get(path) as InferType<EnvSchema, K>;
  }
}
