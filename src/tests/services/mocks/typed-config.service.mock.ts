import { TypedConfigService } from '@/config/env';
import { mock } from '@/tests/utils/mock';

export const MockTypedConfigService = mock<TypedConfigService>({
  get(path: any): any {
    return path as any;
  },
});
