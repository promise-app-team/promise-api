import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const logger = new Logger('TypeORM');

export function typeormConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: config.get('DB_HOST'),
    port: +config.get('DB_PORT'),
    username: config.get('DB_USERNAME'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_DATABASE'),

    logging: false,
    synchronize: false,
    autoLoadEntities: true,
    logger: logger.log.bind(logger),
    entities: ['dist/**/*.entity.js'],
    migrations: ['dist/database/migrations/*.js'],
    migrationsTableName: '_migrations',
    migrationsTransactionMode: 'all',
  };
}
