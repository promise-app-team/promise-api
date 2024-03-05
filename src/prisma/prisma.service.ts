import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient<
  Prisma.PrismaClientOptions,
  'query' | 'info' | 'warn' | 'error'
> {
  constructor(private readonly logger: Logger) {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
        {
          emit: 'event',
          level: 'error',
        },
      ],
    });

    this.$on('query', ({ query, params, duration }) => {
      const sanitizedQuery = query
        .replace(/`promise.+?`\./g, '')
        .replace(/`|`\./g, '')
        .replace(/SELECT\s+(.*?)\s+FROM/, 'SELECT * FROM');

      const _params = JSON.parse(params);
      const injectedQuery = sanitizedQuery.replace(/\?/g, () => {
        const value = _params.shift();
        if (typeof value === 'string') {
          return `'${value}'`;
        }
        return value;
      });

      logger.log(`${injectedQuery}`, {
        label: 'Query',
        ms: duration,
      });
    });
  }
}
