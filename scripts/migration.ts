import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

import chalk from 'chalk';
import { formatISO, parse } from 'date-fns';
import * as R from 'remeda';

///////////////////////////////////////////////////////////////////////////////
// Environment

const envs = {
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

const COMMAND = `bun run migration:${envs.node.env}`;
const SCHEMA_DIR = path.resolve(process.cwd(), path.resolve(__dirname, '../prisma/schema.prisma'));
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
  logger.log(`    ${chalk.bold.gray('$')} ${chalk.bold.blue(`${COMMAND} <command>`)}`);
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

  logger.info('Applying pending migrations...');
  const result = await command.prisma('migrate deploy');

  const migrations = result.match(/\d{14}_[a-z0-9_]+/g);
  if (!migrations) return logger.warn('No pending migrations found.\n');

  const appliedMigrations = R.pipe(
    migrations,
    R.uniq(),
    R.map((migration) => transformMigration(migration)),
    R.sortBy((migration) => migration.createdAt)
  );

  appliedMigrations.forEach(({ filename }) => logger.info(`Applied migration: ${chalk.bold.blue(filename)}`));
  logger.success('Migrations applied successfully.');
}

async function executeDown(count = 1) {
  await checkHealth();

  const { migrations, appliedCount } = await getMigrationStatus();
  if (appliedCount === 0) return logger.warn('No applied migrations found.');

  const n = +count;
  if (n < 1) return logger.error('Invalid count');

  const toRevert = R.pipe(
    migrations,
    R.filter((m) => !!m.appliedAt && !m.filename.match(/^\d{14}_init$/)),
    R.reverse(),
    R.take(n)
  );
  if (toRevert.length === 0) return logger.warn('No migrations to revert.');

  logger.info(`Reverting ${n} migration(s)...`);
  for (const { filename, filepath } of toRevert) {
    if (!filepath.down) return logger.error(`Migration file not found: ${filename}`);
    logger.info(`Reverting migration: ${chalk.bold.blue(filename)}`);
    const ok = await requestContinue();
    if (!ok) return logger.warn('Aborted.');

    const result = await command.prisma(`db execute --file ${filepath.down}`);
    if (result.includes('Error')) return logger.error(result);

    await command.mysql(`DELETE FROM _prisma_migrations WHERE migration_name = "${filename}"`);
    logger.success(`Migration reverted: ${chalk.bold.blue(filename)}\n`);
  }
  logger.success('Migrations reverted successfully.');
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
  const nameLength = R.maxBy(migrations, (m) => m.filename.length)?.filename.length ?? 10;
  const sqlLength = 'UP / DOWN'.length;
  const createdLength = R.maxBy(migrations, (m) => m.createdAt.length)?.createdAt.length ?? 21;
  const appliedLength = R.maxBy(migrations, (m) => m.appliedAt?.length ?? 21)?.appliedAt?.length ?? 21;

  logger.log(
    columns(2, [
      `${' '.repeat(3)}`,
      `${chalk.underline('Migration'.padEnd(nameLength))}`,
      `${chalk.underline('SQL'.padEnd(sqlLength))}`,
      `${chalk.underline('Created At'.padEnd(createdLength))}`,
      `${chalk.underline('Applied At'.padEnd(appliedLength))}`,
    ])
  );
  for (const { filename, createdAt, appliedAt } of migrations) {
    const icon = chalk.bold.gray(`[${appliedAt ? appliedIcon : pendingIcon}]`);
    const name = chalk.bold.cyanBright(filename.padEnd(nameLength));
    const filelink = formatMigrationLink(filename);
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

  const downSql = await command.prisma(
    [
      'migrate diff',
      `--from-schema-datamodel "${SCHEMA_DIR}"`,
      `--to-migrations "${MIGRATION_DIR}"`,
      `--shadow-database-url "${envs.database.shadowUrl}"`,
      `--script`,
    ].join(' ')
  );

  if (downSql.includes('This is an empty migration')) {
    return logger.warn('No changes detected. Update your schema and try again.\n');
  }

  const response = await prompt('Changes detected. Enter a name for the migration: ');
  const name = response
    .toLowerCase()
    .replace(/(\s|\-)/g, '_')
    .replace(/[^a-z0-9_\s]/g, '');

  const filtered = name.replace(/[^a-z]/g, '');
  if (filtered.length < 1) return logger.error('Invalid name. Must contain at least one letter.');

  const ok = await requestContinue(`Create migration file: ${chalk.bold.blue(name)}? (y|n)`);
  if (!ok) return logger.warn('Aborted.');

  logger.info('Generating migration file...');
  const result = await command.prisma(`migrate dev --create-only --skip-generate --skip-seed --name ${name}`);
  const [directory] = result.match(`\\d{14}_${name}`) ?? [];
  if (!directory) throw new Error('Failed to create migration file');

  await fs.writeFile(`${MIGRATION_DIR}/${directory}/migration_down.sql`, downSql);
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
  seed: executeSeed,
  new: executeNew,
  up: executeUp,
  down: executeDown,
  list: executeList,
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

async function prompt(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = `${chalk.bold.blue('???')} ${chalk.bold.gray(message)} `;
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close();
      res(answer.trim());
    });
  });
}

async function requestContinue(message = `Continue? ${chalk.dim('(y|n)')}`): Promise<boolean> {
  while (true) {
    const response = await prompt(message);
    if (['y', 'yes'].includes(response.toLowerCase())) return true;
    if (['n', 'no'].includes(response.toLowerCase())) return false;
    process.stdout.write('\x1b[1A\x1b[2K');
  }
}

const logger = {
  log: (...msg: string[]) => console.log(...msg),
  dim: (...msg: string[]) => console.log(chalk.dim(...msg)),
  info: (...msg: string[]) => console.log(chalk.blue.bold('>>>'), ...msg),
  warn: (...msg: string[]) => console.log(chalk.yellow.bold('>>>'), ...msg),
  error: (...msg: string[]) => console.log(chalk.red.bold('>>>'), ...msg),
  success: (...msg: string[]) => console.log(chalk.green.bold('>>>'), ...msg),
  removeLine: () => process.stdout.write('\x1b[1A\x1b[2K'),
};

function link(text: string, url: string) {
  return `\u001B]8;;${url}\u001B\\${text}\u001B]8;;\u001B\\`;
}

const whitelist = [/password.+?insecure/];
const command = {
  async exec(command: string) {
    // logger.dim(`$ ${command}`);
    return new Promise<string>((res, rej) =>
      exec(command, (error, stdout, stderr) => {
        if (error && !whitelist.some((regex) => regex.test(stderr))) {
          rej(new Error(stderr));
        } else {
          res(stdout);
        }
      })
    );
  },
  async prisma(args: string): Promise<string> {
    return this.exec(`bunx prisma ${args}`);
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
    appliedAt: appliedMigrations[migration.filename],
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
  return rows.map((row) => R.zipObj(header, row));
}

function transformMigration(migration: string) {
  const [date, name] = migration.replace(/[^a-z0-9_]/g, '').split(/_(.*)/s);
  const sanitizedName = name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const up = `${MIGRATION_DIR}/${migration}/migration.sql`;
  const down = sanitizedName !== 'Init' ? `${MIGRATION_DIR}/${migration}/migration_down.sql` : null;
  return {
    filename: migration,
    filepath: { up, down },
    // link: { up: `file://${up}`, down: down ? `file://${down}` : null },
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
