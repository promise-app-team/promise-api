import { DynamicModule, Module } from '@nestjs/common'

import { PrismaModuleAsyncOptions, PrismaModuleOptions } from './prisma.interface'
import { PrismaService } from './prisma.service'

@Module({})
export class PrismaModule {
  static register({ global, scope, prisma }: PrismaModuleOptions): DynamicModule {
    return {
      global,
      module: PrismaModule,
      providers: [
        {
          scope,
          provide: PrismaService,
          useValue: prisma,
        },
      ],
      exports: [PrismaService],
    }
  }

  static registerAsync({ global, scope, inject, useFactory }: PrismaModuleAsyncOptions): DynamicModule {
    return {
      global,
      module: PrismaModule,
      providers: [
        {
          scope,
          provide: PrismaService,
          inject,
          async useFactory(...args: any[]) {
            const { prisma } = await useFactory(...args)
            return prisma ?? new PrismaService()
          },
        },
      ],
      exports: [PrismaService],
    }
  }
}
