import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePromiseTable1708572036273 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    runner.query(
      'ALTER TABLE `pm_promises` MODIFY COLUMN `title` varchar(50) NOT NULL'
    );
  }

  public async down(runner: QueryRunner): Promise<void> {
    runner.query(
      'ALTER TABLE `pm_promises` MODIFY COLUMN `title` varchar(20) NOT NULL'
    );
  }
}
