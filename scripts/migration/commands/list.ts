import chalk from 'chalk';
import { formatISO } from 'date-fns';
import * as R from 'remeda';

import { logger } from '../../utils';
import { COMMAND } from '../constants';
import { checkHealth, checkMigrationInitialized, formatMigrationLink, getMigrationStatus } from '../utils';

import { Command } from './command';

export class ListCommand extends Command('list') {
  async execute() {
    await checkHealth();
    await checkMigrationInitialized();

    const s = await getMigrationStatus();
    const migrations = s.migrations.map(({ createdAt, appliedAt, ...rest }) => {
      return {
        ...rest,
        createdAt: formatISO(createdAt),
        appliedAt: appliedAt ? formatISO(appliedAt) : null,
      };
    });

    const appliedIcon = chalk.green.bold('X');
    const pendingIcon = chalk.red.bold(' ');
    const columns = (gap: number, messages: string[]) => messages.join(' '.repeat(gap));

    logger.info(`${migrations.length} migrations found:`);
    const nameLength = R.firstBy(migrations, [(m) => m.dirname.length, 'desc'])?.dirname.length ?? 10;
    const sqlLength = 'UP / DOWN'.length;
    const createdLength = R.firstBy(migrations, [(m) => m.createdAt.length, 'desc'])?.createdAt.length ?? 21;
    const appliedLength = R.firstBy(migrations, [(m) => m.appliedAt?.length ?? 21, 'desc'])?.appliedAt?.length ?? 21;

    logger.log(
      columns(2, [
        `${' '.repeat(3)}`,
        `${chalk.underline('Migration'.padEnd(nameLength))}`,
        `${chalk.underline('SQL'.padEnd(sqlLength))}`,
        `${chalk.underline('Created At'.padEnd(createdLength))}`,
        `${chalk.underline('Applied At'.padEnd(appliedLength))}`,
      ])
    );
    for (const { dirname, createdAt, appliedAt } of migrations) {
      const icon = chalk.bold.gray(`[${appliedAt ? appliedIcon : pendingIcon}]`);
      const name = chalk.bold.cyanBright(dirname.padEnd(nameLength));
      const filelink = formatMigrationLink(dirname);
      const createdDate = chalk.grey(createdAt);
      const appliedDate = appliedAt ? chalk.grey(appliedAt) : chalk.red('N/A');
      logger.log(columns(2, [`${icon}`, `${name}`, filelink, createdDate, appliedDate]));
    }

    const status =
      s.appliedCount === migrations.length
        ? chalk.green.bold('All migrations applied')
        : chalk.red.bold('Pending migrations exist');

    if (s.pendingCount > 0) {
      logger.warn(`Status: ${status}`, `(${s.appliedCount} applied, ${s.pendingCount} pending)`);
      logger.info(`Run ${chalk.bold.blue(`$ ${COMMAND} up`)} to apply pending migrations.`);
    } else {
      logger.success(`Status: ${status}`);
    }
  }
}
