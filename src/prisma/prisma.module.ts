import { DynamicModule, Module } from '@nestjs/common';

import { PrismaModuleAsyncOptions, PrismaModuleOptions } from './prisma.interface';
import { PrismaService } from './prisma.service';

@Module({})
export class PrismaModule {
  static register(options: PrismaModuleOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      providers: [
        {
          scope: options.scope,
          provide: PrismaService,
          useValue: options.prisma,
        },
      ],
      exports: [PrismaService],
    };
  }

  static registerAsync(options: PrismaModuleAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      providers: [
        {
          scope: options.scope,
          provide: PrismaService,
          inject: options.inject,
          async useFactory(...args: any[]) {
            const { prisma } = await options.useFactory(...args);
            return prisma ?? new PrismaService();
          },
        },
      ],
      exports: [PrismaService],
    };
  }
}
