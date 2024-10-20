import { createParamDecorator } from '@nestjs/common'

export const AuthUser = createParamDecorator((data, ctx) => {
  const user = ctx.switchToHttp().getRequest().user
  return (data ? user?.[data] : user) ?? null
})
