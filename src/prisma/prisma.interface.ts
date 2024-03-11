import { Prisma, PrismaClient as BasePrismaClient } from '@prisma/client';

type PrismaClient = BasePrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>;

type PrismaClientOptions = Prisma.PrismaClientOptions & {
  transform?: (prisma: PrismaClient) => PrismaClient;
};

export interface PrismaModuleOptions {
  isGlobal?: boolean;
  prismaOptions?: PrismaClientOptions;
}

export interface PrismaModuleAsyncOptions extends PrismaModuleOptions {
  inject?: any[];
  useFactory: (...args: any[]) => PrismaClientOptions | Promise<PrismaClientOptions>;
}
