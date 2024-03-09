import { ExceptionStatus } from '@/common';

export type Path = string | string[];

export interface HttpApiOptions {
  auth: boolean;
  summary: string;
  description: string;
  exceptions: ExceptionStatus[];
}
