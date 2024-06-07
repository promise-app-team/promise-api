import chalk from 'chalk';

import { logger } from '../../utils';
import { COMMAND } from '../constants';
import { envs } from '../envs';

import { Command } from './command';

export class HelpCommand extends Command('help') {
  async execute() {
    logger.log(chalk.bold('======================================================================='));
    logger.log(chalk.bold('                       🛸 Prisma Migrate CLI 🐢                       '));
    logger.log(chalk.bold('======================================================================='));
    logger.info(chalk.bold('Description:'));
    logger.log('    This command is a wrapper around Prisma Migrate CLI.');
    logger.info(chalk.bold('Usage:'));
    logger.log(`    ${chalk.bold.dim('$')} ${COMMAND} <command>`);
    logger.info(chalk.bold('Available Commands:'));
    logger.log(chalk.gray(`    - ${chalk.yellow('up')}                          apply pending migrations (for prod)`));
    logger.log(
      chalk.gray(`    - ${chalk.yellow('down')} <n>                    revert last n migrations (default: 1)`)
    );
    logger.log(chalk.gray(`    - ${chalk.yellow('list')}                        list all migrations and their status`));
    logger.log(
      chalk.gray(`    - ${chalk.yellow('new')}                         create a new migration file (for dev)`)
    );
    logger.log(chalk.gray(`    - ${chalk.yellow('seed')}                        seed the database`));
    logger.log(chalk.gray(`    - ${chalk.yellow('help')}                        display this help message`));
    logger.log(chalk.bold('======================================================================='));
    logger.log(chalk.bold(`Current stage: ${chalk.cyan.bold(envs.stage)}`));
  }
}
