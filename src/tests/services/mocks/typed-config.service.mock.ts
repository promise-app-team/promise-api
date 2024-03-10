import { TypedConfigService } from '@/common';
import { EnvSchema } from '@/common/config/env';
import { FlattenObjectKeys, InferType, MethodTypes } from '@/types';

export class MockTypedConfigService implements MethodTypes<TypedConfigService> {
  get<K extends FlattenObjectKeys<EnvSchema>>(path: K): InferType<EnvSchema, K> {
    return path as any;
  }
}
