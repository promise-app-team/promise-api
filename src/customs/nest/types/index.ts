import type { ExceptionStatus } from '@/common/exceptions'
import type { NestInterceptor, Type } from '@nestjs/common'

export type Path = string | string[]

export interface HttpAPIOptions {
  auth?: boolean
  hidden?: boolean
  render?: string
  summary?: string
  description?: string
  response?: Type
  exceptions?: ExceptionStatus[]
  interceptors?: (NestInterceptor | Type)[]
}
