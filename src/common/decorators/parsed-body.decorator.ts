import { createParamDecorator } from '@nestjs/common'

import type { ExecutionContext } from '@nestjs/common'

export const ParsedBody = createParamDecorator((path: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()

  let body = request.body
  try {
    if (Buffer.isBuffer(request.body)) {
      body = JSON.parse(request.body.toString())
    }
    else {
      body = JSON.parse(request.body)
    }
  }
  catch {
    body = request.body
  }

  return path ? body[path] : body
})
