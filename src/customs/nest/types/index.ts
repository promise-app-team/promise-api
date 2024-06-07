import { NestInterceptor, Type } from '@nestjs/common';

import { ExceptionStatus } from '@/common/exceptions';

export type Path = string | string[];

export interface HttpAPIOptions {
  auth?: boolean;
  hidden?: boolean;
  render?: string;
  summary?: string;
  description?: string;
  response?: Type;
  exceptions?: ExceptionStatus[];
  interceptors?: (NestInterceptor | Function)[];
}
