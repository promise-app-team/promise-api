import { TypedConfigService } from '@/config/env';
import { MethodTypes } from '@/types';

export class MockTypedConfigService implements MethodTypes<TypedConfigService> {
  get(path: any): any {
    return path as any;
  }
}
