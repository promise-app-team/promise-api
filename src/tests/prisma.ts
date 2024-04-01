import { Prisma, PrismaClient } from '@prisma/client';

interface PrismaClientOptions {
  logging?: boolean;
}

export function createPrismaClient(options: PrismaClientOptions = {}): PrismaClient {
  const prisma = new PrismaClient<Prisma.PrismaClientOptions, 'query'>({
    log: options.logging ? [{ emit: 'event', level: 'query' }] : [],
  });

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
