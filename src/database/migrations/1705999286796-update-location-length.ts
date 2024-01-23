import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLocationLength1705999286796 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE `pm_locations` MODIFY COLUMN `city` varchar(50) NOT NULL'
    );
    await runner.query(
      'ALTER TABLE `pm_locations` MODIFY COLUMN `district` varchar(50) NOT NULL'
    );
    await runner.query(
      'ALTER TABLE `pm_locations` MODIFY COLUMN `address` varchar(100) DEFAULT NULL'
    );
  }

  public async down(_runner: QueryRunner): Promise<void> {}
}
