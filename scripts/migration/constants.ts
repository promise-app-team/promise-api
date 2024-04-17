import path from 'node:path';

import { envs } from './envs';

export const COMMAND = `npm run migration:${envs.stage}`;
export const SCHEMA_FILE = path.resolve(process.cwd(), path.resolve(__dirname, '../../prisma/schema.prisma'));
export const MIGRATION_DIR = path.resolve(process.cwd(), path.resolve(__dirname, '../../prisma/migrations'));
