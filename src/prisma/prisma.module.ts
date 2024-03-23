import { DynamicModule, Module } from '@nestjs/common';

import { PrismaModuleAsyncOptions, PrismaModuleOptions } from './prisma.interface';
import { PrismaService } from './prisma.service';

@Module({})
export class PrismaModule {
  static register(options: PrismaModuleOptions): DynamicModule {
    return {
      module: PrismaModule,
      global: options.isGlobal,
      providers: [
        {
          provide: PrismaService,
          useFactory() {
            return new PrismaService(options.prismaOptions ?? {});
          },
        },
      ],
      exports: [PrismaService],
    };
  }

  static registerAsync(options: PrismaModuleAsyncOptions): DynamicModule {
    return {
      module: PrismaModule,
      global: options.isGlobal,
      providers: [
        {
          provide: PrismaService,
          async useFactory(...args: any[]) {
            const { transform, ...prismaOptions } = await options.useFactory(...args);
            const prisma = new PrismaService(prismaOptions);
            return Object.assign(prisma, transform?.(prisma));
          },
          inject: options.inject,
        },
      ],
      exports: [PrismaService],
    };
  }
}
