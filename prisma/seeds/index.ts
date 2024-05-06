import { parseArgs } from 'node:util';

import { PrismaClient, Prisma } from '@prisma/client';
import chalk from 'chalk';

import { logger } from '../../scripts/utils';

import { clean } from './helpers/clean';
import { seed } from './helpers/seed';

const environment = process.env.NODE_ENV || 'local';

async function main() {
  const { values } = parseArgs({
    options: {
      stage: { type: 'string', default: 'local' },
    },
  });

  const availableStages = ['local', 'dev', 'test', 'prod'];
  if (!availableStages.includes(values.stage ?? '')) {
    logger.error(`Invalid stage: ${values.stage}. (Available stages: ${availableStages.join(', ')})`);
    process.exit(1);
  }

  logger.info(`Seeding database for ${chalk.underline.bold(process.env.DB_URL)}`);

  await new PrismaClient({
    transactionOptions: {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  }).$transaction(async (prisma: any) => {
    await clean(prisma);

    if (['local', 'development'].includes(environment)) {
      await seed(prisma);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
