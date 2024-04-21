import { PrismaClient } from '@prisma/client';

import { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest';

interface _PrismaModuleOptions {
  prisma?: PrismaClient;
}

interface _PrismaModuleAsyncOptions extends BaseFactoryProvider<_PrismaModuleOptions> {}

export type PrismaModuleOptions = _PrismaModuleOptions & BaseModuleOptions;
export type PrismaModuleAsyncOptions = _PrismaModuleAsyncOptions & BaseModuleOptions;
