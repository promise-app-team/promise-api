import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDateColumnsPromiseUsersTable1708493599048
  implements MigrationInterface
{
  public async up(runner: QueryRunner): Promise<void> {
    runner.query(`
      ALTER TABLE pm_promise_users
      ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    runner.query(`
      ALTER TABLE pm_promise_users
      DROP COLUMN created_at,
      DROP COLUMN updated_at
    `);
  }
}
