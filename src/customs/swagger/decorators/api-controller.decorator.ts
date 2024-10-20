import { ApiInternalServerErrorResponse, ApiOperation } from '@nestjs/swagger'

import { HttpException } from '@/common/exceptions'

export function ApiController(): ClassDecorator {
  return (constructor) => {
    Object.getOwnPropertyNames(constructor.prototype).forEach((method) => {
      const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, method)
      if (method === 'constructor' || typeof constructor.prototype[method] !== 'function' || !descriptor) return
      ApiOperation({ operationId: method, summary: method })(constructor.prototype, method, descriptor)
      ApiInternalServerErrorResponse({ type: HttpException })(constructor.prototype, method, descriptor)
    })
  }
}
