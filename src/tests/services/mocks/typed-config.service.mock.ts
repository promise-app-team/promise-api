import { TypedConfig } from '@/config/env';
import { MethodTypes } from '@/types';

export class MockTypedConfigService implements MethodTypes<TypedConfig> {
  get(path: any): any {
    return path as any;
  }
}
