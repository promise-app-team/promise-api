import { logger } from '../../utils';
import { checkHealth, checkMigrationInitialized, checkMigrationLatest, command } from '../utils';

import { Command } from './command';

export class SeedCommand extends Command('seed') {
  async execute() {
    await Promise.all([checkHealth(), checkMigrationInitialized(), checkMigrationLatest()]);

    const result = await command.prisma('db seed');
    logger.info(result);
  }
}
