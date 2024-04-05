import fs from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';
import { formatISO, parse } from 'date-fns';
import * as R from 'remeda';

import { execute, highlight, link, logger, prompt } from './utils';

///////////////////////////////////////////////////////////////////////////////
// Environment

const envs = {
  stage: process.env.STAGE,
  node: {
    env: process.env.NODE_ENV || 'unknown',
  },
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: `${process.env.DB_NAME}_${process.env.STAGE}`,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    url: process.env.DB_URL,
    shadowUrl: process.env.DB_SHADOW_URL,
  },
} as const;

const COMMAND = `npm run migration:${envs.stage}`;
const SCHEMA_FILE = path.resolve(process.cwd(), path.resolve(__dirname, '../prisma/schema.prisma'));
const MIGRATION_DIR = path.resolve(process.cwd(), path.resolve(__dirname, '../prisma/migrations'));

///////////////////////////////////////////////////////////////////////////////
// Commands

async function executeHelp() {
  logger.log(chalk.bold('======================================================================='));
  logger.log(chalk.bold('                       🛸 Prisma Migrate CLI 🐢                       '));
  logger.log(chalk.bold('======================================================================='));
  logger.info(chalk.bold('Description:'));
  logger.log('    This command is a wrapper around Prisma Migrate CLI.');
  logger.info(chalk.bold('Usage:'));
  logger.log(`    ${chalk.bold.dim('$')} ${COMMAND} <command>`);
  logger.info(chalk.bold('Available Commands:'));
  logger.log(chalk.gray(`    - ${chalk.yellow('up')}                          apply pending migrations (for prod)`));
  logger.log(chalk.gray(`    - ${chalk.yellow('down')} <n>                    revert last n migrations (default: 1)`));
  logger.log(chalk.gray(`    - ${chalk.yellow('list')}                        list all migrations and their status`));
  logger.log(chalk.gray(`    - ${chalk.yellow('new')}                         create a new migration file (for dev)`));
  logger.log(chalk.gray(`    - ${chalk.yellow('seed')}                        seed the database`));
  logger.log(chalk.gray(`    - ${chalk.yellow('help')}                        display this help message`));
  logger.log(chalk.bold('======================================================================='));
  logger.log(chalk.bold(`Your current environment: ${chalk.cyan.bold(envs.node.env)}`));
}

async function executeUp() {
  await checkHealth();

  const { migrations } = await getMigrationStatus();
  const pendingMigrations = R.filter(migrations, (m) => !m.appliedAt);

  if (!pendingMigrations.length) return logger.warn('No pending migrations found.');
  logger.info(`${pendingMigrations.length} pending migrations found.`);
  for (const { dirname } of pendingMigrations) {
    logger.log(`· ${chalk.magenta(dirname)} [${formatMigrationLink(dirname)}]`);
  }

  logger.newline();
  logger.info('Applying pending migrations...');
  const ok = await requestContinue();
  if (!ok) return logger.warn('Aborted.');

  const schema = pendingMigrations.slice(-1)[0].filepath.schema;
  const result = await command.prisma(`migrate deploy`);
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

async function executeDown(count = 1) {
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
    const schema = migrations.slice(-i - 2)[0].filepath.schema;
    await command.prisma(`generate --schema ${schema}`);
  }

  logger.success('Migrations reverted successfully.');
  toRevert.forEach(({ dirname }) => logger.log(`· ${chalk.blue(dirname)}`));
}

async function executeList() {
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

async function executeNew() {
  await checkMigrationNotLatest();
  const [upSql, downSql] = await Promise.all([
    command.prisma(
      ['migrate diff', `--to-schema-datamodel "${SCHEMA_FILE}"`, `--from-url "${envs.database.url}"`, `--script`].join(
        ' '
      )
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

async function executeSeed() {
  await Promise.all([checkHealth(), checkMigrationInitialized(), checkMigrationNotLatest()]);

  const result = await command.prisma('db seed');
  logger.info(result);
}

const operation = {
  help: executeHelp,
  up: executeUp,
  down: executeDown,
  list: executeList,
  new: executeNew,
  seed: executeSeed,
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const hint = `Use ${chalk.bold.blue(`$ ${COMMAND} help`)} to see available commands.`;

  if (!command) {
    logger.error(`No command provided.`);
    logger.info(hint);
  } else if (!operation[command]) {
    logger.error(`Unknown command: ${command}`);
    logger.info(hint);
  } else {
    await operation[command](...args.slice(1));
  }
}

///////////////////////////////////////////////////////////////////////////////
// Helpers

async function requestContinue(message = 'Continue?'): Promise<boolean> {
  while (true) {
    const response = await prompt(`${message} ${chalk.dim('[Y|n]')}`);
    if (['', 'y', 'yes'].includes(response.toLowerCase())) return true;
    if (['n', 'no'].includes(response.toLowerCase())) return false;
    process.stdout.write('\x1b[1A\x1b[2K');
  }
}

const command = {
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

async function checkHealth() {
  const result = await command.mysql('SELECT 1');
  if (!result) {
    logger.error('MySQL Database is not available.');
    process.exit(1);
  }
}

async function checkMigrationInitialized() {
  const result = await command.mysql('SHOW TABLES LIKE "_prisma_migrations"');
  if (!result.includes('_prisma_migrations')) {
    logger.error('Prisma Migrate is not initialized.');
    logger.info(`Run ${chalk.bold.blue(`$ ${COMMAND} up`)} to initialize the database.`);
    process.exit(1);
  }
}

async function checkMigrationNotLatest() {
  try {
    await command.prisma('migrate status');
  } catch {
    logger.error('Pending migrations exist.');
    logger.info(`Run ${chalk.bold.blue(`$ ${COMMAND} up`)} to apply pending migrations.`);
    process.exit(1);
  }
}

async function getAllMigrations() {
  return R.pipe(
    await fs.readdir(MIGRATION_DIR),
    R.filter((dir) => /^\d{14}_/.test(dir)),
    R.map((migration) => transformMigration(migration)),
    R.sortBy((migration) => migration.createdAt)
  );
}

async function getAppliedMigrations() {
  const result2 = await command.mysql('SELECT * FROM `_prisma_migrations`');
  return R.mapToObj(parseTSV(result2.trim()), (row) => [row['migration_name'], new Date(row['finished_at'])]);
}

async function getMigrationStatus() {
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

function parseTSV(data: string): Record<string, string>[] {
  const [header, ...rows] = data.split('\n').map((row) => row.split('\t'));
  return rows.map((row) => R.fromEntries.strict(R.zip(header, row)));
}

function transformMigration(migration: string) {
  const [date, name] = migration.replace(/[^a-z0-9_]/g, '').split(/_(.*)/s);
  const sanitizedName = name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const up = `${MIGRATION_DIR}/${migration}/migration.sql`;
  const down = sanitizedName !== 'Init' ? `${MIGRATION_DIR}/${migration}/migration_down.sql` : null;
  const schema = `${MIGRATION_DIR}/${migration}/schema.prisma`;
  return {
    dirname: migration,
    filepath: { up, down, schema },
    name: sanitizedName,
    createdAt: parse(date, 'yyyyMMddHHmmss', new Date()),
  };
}

function formatMigrationLink(migrationName: string, opts?: { up?: string; down?: string }) {
  const isInit = migrationName.match(/\d{14}_init/);
  const dirPath = path.resolve(MIGRATION_DIR, migrationName);
  const [up, down] = [`file://${dirPath}/migration.sql`, !isInit ? `file://${dirPath}/migration_down.sql` : null];
  const upLink = link(opts?.up ?? 'UP', up);
  const downLink = down ? link(opts?.down ?? 'DOWN', down) : chalk.dim.strikethrough(opts?.down ?? 'DOWN');
  return `${upLink} / ${downLink}`;
}

///////////////////////////////////////////////////////////////////////////////
// Main

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
