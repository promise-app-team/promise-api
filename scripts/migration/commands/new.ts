import fs from 'node:fs/promises';

import chalk from 'chalk';

import { highlight, logger, prompt } from '../../utils';
import { MIGRATION_DIR, SCHEMA_FILE } from '../constants';
import { envs } from '../envs';
import { checkMigrationLatest, command, formatMigrationLink, requestContinue } from '../utils';

import { Command } from './command';

export class NewCommand extends Command('new') {
  async execute() {
    await checkMigrationLatest();
    const [upSql, downSql] = await Promise.all([
      command.prisma(
        [
          'migrate diff',
          `--to-schema-datamodel "${SCHEMA_FILE}"`,
          `--from-url "${envs.database.url}"`,
          `--script`,
        ].join(' ')
      ),
      command.prisma(
        [
          'migrate diff',
          `--from-schema-datamodel "${SCHEMA_FILE}"`,
          `--to-migrations "${MIGRATION_DIR}"`,
          `--shadow-database-url "${envs.database.shadowUrl}"`,
          `--script`,
        ].join(' ')
      ),
    ]);

    if (!upSql.trim() || upSql.includes('This is an empty migration')) {
      logger.warn('No changes detected. Are you sure you want to create a empty migration?');
      const ok = await requestContinue();
      if (!ok) return logger.warn('Aborted.');
    } else {
      logger.info('Changes detected. Check the SQL scripts below:');
      logger.newline();
      logger.log(chalk.bold('UP SQL:'));
      logger.log(highlight(upSql, { language: 'sql' }));
      logger.log(chalk.bold('DOWN SQL:'));
      logger.log(highlight(downSql, { language: 'sql' }));
    }

    const name = await prompt('Enter a name for the migration:').then((res) =>
      res
        .toLowerCase()
        .replace(/(\s|\-)/g, '_')
        .replace(/[^a-z0-9_\s]/g, '')
    );

    const filtered = name.replace(/[^a-z]/g, '');
    if (filtered.length < 1) return logger.error('Invalid name. Must contain at least one letter.');

    const ok = await requestContinue(`Create migration file: ${chalk.bold.blue(name)}?`);
    if (!ok) return logger.warn('Aborted.');

    logger.info('Generating migration file...');
    const result = await command.prisma(`migrate dev --create-only --skip-generate --skip-seed --name ${name}`);
    const [directory] = result.match(`\\d{14}_${name}`) ?? [];
    if (!directory) throw new Error('Failed to create migration file');

    await fs.writeFile(`${MIGRATION_DIR}/${directory}/migration_down.sql`, `${downSql}\n`);
    await fs.copyFile(`${SCHEMA_FILE}`, `${MIGRATION_DIR}/${directory}/schema.prisma`);
    const filelink = formatMigrationLink(directory, {
      up: `${directory}/migration.sql`,
      down: `${directory}/migration_down.sql`,
    });
    logger.success(`Migration file created: ${filelink}`);
    logger.info('Please review the migration file and run the up command to apply the changes.');
  }
}
