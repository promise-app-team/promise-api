import chalk from 'chalk';
import * as R from 'remeda';

import { logger } from '../../utils';
import {
  checkHealth,
  command,
  formatMigrationLink,
  getMigrationStatus,
  requestContinue,
  transformMigration,
} from '../utils';

import { Command } from './command';

export class UpCommand extends Command('up') {
  async execute() {
    await checkHealth();

    const { migrations } = await getMigrationStatus();
    const pendingMigrations = R.filter(migrations, (m) => !m.appliedAt);

    if (!pendingMigrations.length) return logger.warn('No pending migrations found.');
    logger.info(`${pendingMigrations.length} pending migrations found.`);
    for (const { dirname } of pendingMigrations) {
      logger.log(`· ${chalk.magenta(dirname)} [${formatMigrationLink(dirname)}]`);
    }

    logger.newline();
    logger.info(`Applying ${pendingMigrations.length} migration(s)...`);
    const ok = await requestContinue();
    if (!ok) return logger.warn('Aborted.');

    const result = await command.prisma(`migrate deploy`).catch(async (reason) => {
      logger.error(reason);
      await command.mysql('DELETE FROM `_prisma_migrations` WHERE `logs` IS NOT NULL');
      process.exit(1);
    });

    const schema = pendingMigrations.slice(-1)[0].filepath.schema;
    await command.prisma(`generate --schema ${schema}`);

    const appliedMigrations = R.pipe(
      result.match(/\d{14}_[a-z0-9_]+/g) ?? [],
      R.unique(),
      R.map((migration) => transformMigration(migration)),
      R.sortBy((migration) => migration.createdAt)
    );

    logger.success('Migrations applied successfully.');
    appliedMigrations.forEach(({ dirname }) => logger.log(`· ${chalk.blue(dirname)}`));
  }
}
