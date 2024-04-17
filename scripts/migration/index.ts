import chalk from 'chalk';
import * as R from 'remeda';

import { logger } from '../utils';

import { COMMAND } from './constants';

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const hint = `Use ${chalk.bold.blue(`$ ${COMMAND} help`)} to see available commands.`;

  const operators = R.mapKeys(await import('./commands'), (_, cmd) => cmd['alias']);
  const command = operators[cmd] ? new operators[cmd]() : null;

  if (command) {
    await command.execute(...args);
  } else {
    logger.error(cmd ? `Unknown command: ${cmd}` : `No command provided.`);
    logger.info(hint);
  }
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
