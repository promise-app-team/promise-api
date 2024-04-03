import { PrismaClient } from '@prisma/client';

import { memoize } from '@/utils/func';

interface PrismaClientOptions {
  logging?: boolean;
}

const memoizePrismaClient = memoize((options: PrismaClientOptions) => {
  return new PrismaClient({
    log: options.logging ? [{ emit: 'event', level: 'query' }] : [],
  });
});

export function createPrismaClient(options: PrismaClientOptions = {}): PrismaClient {
  const prisma = memoizePrismaClient(options);

  prisma.$on('query', ({ query, params, duration }) => {
    const tableName = process.env.DB_NAME;
    const sanitizedQuery = query
      .replace(/^SELECT\s+(.*?)\s+FROM/, 'SELECT * FROM')
      .replace(new RegExp(`\`${tableName}[._a-z]+?\`\.`, 'g'), '')
      .replace(/\((?<table>`.+?`).(?<field>`.+?`)\)/g, '$<table>.$<field>');

    const _params = JSON.parse(params);
    const injectedQuery = sanitizedQuery.replace(/\?/g, () => {
      const value = _params.shift();
      if (typeof value === 'string') {
        return `'${value}'`;
      }
      return value;
    });

    console.log(injectedQuery, `+${duration}ms`);
  });

  return prisma;
}

export async function deleteMany(prisma: PrismaClient, min: number, max: number) {
  await prisma.$transaction([
    prisma.location.deleteMany({ where: { id: { gte: min, lt: max } } }),
    prisma.theme.deleteMany({ where: { id: { gte: min, lt: max } } }),
    prisma.user.deleteMany({ where: { id: { gte: min, lt: max } } }),
    prisma.promise.deleteMany({ where: { id: { gte: min, lt: max } } }),
  ]);
}
