import { Type } from '@nestjs/common';

import { ExceptionStatus } from '@/common/exceptions/http.exception';

export type Path = string | string[];

export interface HttpAPIOptions {
  auth?: boolean;
  summary?: string;
  description?: string;
  response?: Type;
  exceptions?: ExceptionStatus[];
}
