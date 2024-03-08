import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { HasherService, LoggerService } from '@/common';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>
  implements OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly hasher: HasherService
  ) {
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
        .replace(/^SELECT\s+(.*?)\s+FROM/, 'SELECT * FROM')
        .replace(/`promise[\-a-z]+?`\./g, '')
        .replace(/\((?<table>`.+?`).(?<field>`.+?`)\)/g, '$<table>.$<field>');

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

  onModuleInit() {
    Object.assign(
      this,
      this.$extends({
        result: {
          promise: {
            pid: {
              needs: { id: true },
              compute: (data) => this.hasher.encode(data.id),
            },
          },
        },
      })
    );
  }
}
