import { ApiOperation as BaseApiOperation, ApiOperationOptions } from '@nestjs/swagger';

export function ApiOperation(options: ApiOperationOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    BaseApiOperation({
      operationId: String(propertyKey),
      summary: String(propertyKey),
      ...options,
    })(target, propertyKey, descriptor);
  };
}
