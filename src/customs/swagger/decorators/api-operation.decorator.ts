import { ApiOperation as BaseApiOperation } from '@nestjs/swagger';

import type { ApiOperationOptions } from '@nestjs/swagger';

export function ApiOperation(options: ApiOperationOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    BaseApiOperation({
      operationId: String(propertyKey),
      summary: String(propertyKey),
      ...options,
    })(target, propertyKey, descriptor);
  };
}
