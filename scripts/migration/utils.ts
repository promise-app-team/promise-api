import fs from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';
import { parse } from 'date-fns';
import * as R from 'remeda';

import { execute, link, logger, prompt } from '../utils';

import { COMMAND, MIGRATION_DIR } from './constants';
import { envs } from './envs';

export async function requestContinue(message = 'Continue?'): Promise<boolean> {
  while (true) {
    const response = await prompt(`${message} ${chalk.dim('[Y|n]')}`);
    if (['', 'y', 'yes'].includes(response.toLowerCase())) return true;
    if (['n', 'no'].includes(response.toLowerCase())) return false;
    process.stdout.write('\x1b[1A\x1b[2K');
  }
}

export const command = {
  async exec(command: string) {
    return execute(command, { whitelists: [/password.+?insecure/], echo: false });
  },
  async prisma(args: string): Promise<string> {
    return this.exec(`npx prisma ${args}`);
  },
  async mysql(...queries: string[]): Promise<string> {
    const { host, port, name, user, password } = envs.database;
    return this.exec(
      `docker run --rm --network=host mysql:8.3 mysql -h${host} -P${port} -u${user} -p${password} ${name} -e '${queries.join(';')}'`
    );
  },
};

export async function checkHealth() {
  const result = await command.mysql('SELECT 1');
  if (!result) {
    logger.error('MySQL Database is not available.');
    process.exit(1);
  }
}

export async function checkMigrationInitialized() {
  const result = await command.mysql('SHOW TABLES LIKE "_prisma_migrations"');
  if (!result.includes('_prisma_migrations')) {
    logger.error('Prisma Migrate is not initialized.');
    logger.info(`Run ${chalk.bold.blue(`$ ${COMMAND} up`)} to initialize the database.`);
    process.exit(1);
  }
}

export async function checkMigrationLatest() {
  try {
    await command.prisma('migrate status');
  } catch {
    logger.error('Pending migrations exist.');
    logger.info(`Run ${chalk.bold.blue(`$ ${COMMAND} up`)} to apply pending migrations.`);
    process.exit(1);
  }
}

export async function getAllMigrations() {
  return R.pipe(
    await fs.readdir(MIGRATION_DIR),
    R.filter((dir) => /^\d{14}_/.test(dir)),
    R.map((migration) => transformMigration(migration)),
    R.sortBy((migration) => migration.createdAt)
  );
}

export async function getAppliedMigrations() {
  const result = await command.mysql('SELECT * FROM `_prisma_migrations`');
  return R.mapToObj(parseTSV(result.trim()), (row) => [row['migration_name'], new Date(row['finished_at'])]);
}

export async function getMigrationStatus() {
  const appliedMigrations = await getAppliedMigrations();
  const migrations = R.map(await getAllMigrations(), (migration) => ({
    ...migration,
    appliedAt: (appliedMigrations[migration.dirname] ?? null) as Date | null,
  }));

  const appliedCount = R.filter(migrations, (m) => !!m.appliedAt).length;
  const pendingCount = migrations.length - appliedCount;

  return {
    appliedCount,
    pendingCount,
    migrations,
  };
}

export function parseTSV(data: string): Record<string, string>[] {
  const [header, ...rows] = data.split('\n').map((row) => row.split('\t'));
  return rows.map((row) => R.fromEntries(R.zip(header, row)));
}

export function transformMigration(migration: string) {
  const [date, name] = migration.replace(/[^a-z0-9_]/g, '').split(/_(.*)/s);
  const up = `${MIGRATION_DIR}/${migration}/migration.sql`;
  const down = name !== 'init' ? `${MIGRATION_DIR}/${migration}/migration_down.sql` : null;
  const schema = `${MIGRATION_DIR}/${migration}/schema.prisma`;
  return {
    dirname: migration,
    filepath: { up, down, schema },
    name,
    createdAt: parse(date, 'yyyyMMddHHmmss', new Date()),
  };
}

export function formatMigrationLink(migrationName: string, opts?: { up?: string; down?: string }) {
  const isInit = migrationName.match(/\d{14}_init/);
  const dirPath = path.resolve(MIGRATION_DIR, migrationName);
  const [up, down] = [`file://${dirPath}/migration.sql`, !isInit ? `file://${dirPath}/migration_down.sql` : null];
  const upLink = link(opts?.up ?? 'UP', up);
  const downLink = down ? link(opts?.down ?? 'DOWN', down) : chalk.dim.strikethrough(opts?.down ?? 'DOWN');
  return `${upLink} / ${downLink}`;
}
