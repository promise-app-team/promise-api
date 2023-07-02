import { Options } from '@mikro-orm/core';
import { Logger } from '@nestjs/common';

const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PASSWORD = process.env.DB_PASSWORD;

const logger = new Logger('MikroORM');
const config: Options = {
  type: 'mysql',
  host: DB_HOST,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  dbName: DB_DATABASE,
  port: +DB_PORT,

  entities: ['dist/entities'],
  entitiesTs: ['src/entities'],
  logger: logger.log.bind(logger),
  migrations: {
    tableName: '_migrations',
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    snapshot: false,
  },
};

export default config;
