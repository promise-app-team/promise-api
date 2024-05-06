import { PrismaClient } from '@prisma/client';

export async function clean(prisma: PrismaClient) {
  await Promise.all([
    prisma.location.deleteMany({ where: { id: { gte: 1_000_000 } } }),
    prisma.user.deleteMany({ where: { id: { gte: 1_000_000 } } }),
  ]);
}
