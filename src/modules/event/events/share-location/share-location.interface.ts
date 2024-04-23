import { CacheService } from '@/customs/cache';
import { PrismaService } from '@/prisma';

export interface ShareLocationContext {
  prisma: PrismaService;
  cache: CacheService;
}
