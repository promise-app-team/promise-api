import type { BaseFactoryProvider, BaseModuleOptions } from '@/types/nest'
import type { PrismaClient } from '@prisma/client'

interface _PrismaModuleOptions {
  prisma?: PrismaClient
}

interface _PrismaModuleAsyncOptions extends BaseFactoryProvider<_PrismaModuleOptions> {}

export type PrismaModuleOptions = _PrismaModuleOptions & BaseModuleOptions
export type PrismaModuleAsyncOptions = _PrismaModuleAsyncOptions & BaseModuleOptions
