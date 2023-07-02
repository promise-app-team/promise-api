import { Logger } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PASSWORD = process.env.DB_PASSWORD;

const logger = new Logger('TypeORM');
export const typeormConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: DB_HOST,
  port: +DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,

  logging: false,
  synchronize: false,
  autoLoadEntities: true,
  logger: logger.log.bind(logger),
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  migrationsTableName: '_migrations',
  migrationsTransactionMode: 'all',
};
