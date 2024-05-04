import chalk from 'chalk';
import * as R from 'remeda';

import { logger } from '../../utils';
import { envs } from '../envs';
import { checkHealth, command, formatMigrationLink, getMigrationStatus, requestContinue } from '../utils';

import { Command } from './command';

export class DownCommand extends Command('down') {
  async execute(count = '1') {
    await checkHealth();

    const { migrations, appliedCount } = await getMigrationStatus();
    if (appliedCount === 0) {
      return logger.warn('No applied migrations found.');
    }

    const n = R.clamp(+count, { min: 1, max: appliedCount - 1 });
    const toRevert = R.pipe(
      migrations,
      R.filter((m) => !!m.appliedAt),
      R.reverse(),
      R.take(n)
    );
    if (toRevert.length === 0) {
      return logger.warn('No migrations to revert.');
    }

    logger.info(`${toRevert.length} migration(s) to revert:`);
    for (const { dirname } of toRevert) {
      logger.log(`· ${chalk.magenta(dirname)} [${formatMigrationLink(dirname)}]`);
    }

    logger.newline();
    logger.info(`Reverting ${toRevert.length} migration(s)...`);
    const ok = await requestContinue();
    if (!ok) return logger.warn('Aborted.');

    for (const [i, { dirname, filepath }] of toRevert.entries()) {
      const result = await command.prisma(`db execute --file ${filepath.down}`);
      if (result.includes('Error')) return logger.error(result);
      await command.mysql(`DELETE FROM _prisma_migrations WHERE migration_name = "${dirname}"`);

      if (envs.stage === 'local') {
        const schema = migrations.slice(-i - 2)[0].filepath.schema;
        await command.prisma(`generate --schema ${schema}`);
      }
    }

    logger.success('Migrations reverted successfully.');
    toRevert.forEach(({ dirname }) => logger.log(`· ${chalk.blue(dirname)}`));
  }
}
