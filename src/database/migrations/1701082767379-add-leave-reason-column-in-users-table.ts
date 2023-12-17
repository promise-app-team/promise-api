import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveReasonColumnInUsersTable1701082767379
  implements MigrationInterface
{
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE pm_users ADD COLUMN leave_reason VARCHAR(255) NULL DEFAULT NULL AFTER deleted_at`
    );
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE pm_users DROP COLUMN leave_reason`);
  }
}
