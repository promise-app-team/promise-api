import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const ParsedBody = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  try {
    if (Buffer.isBuffer(request.body)) {
      return JSON.parse(request.body.toString());
    }
    return JSON.parse(request.body);
  } catch {
    return request.body;
  }
});
