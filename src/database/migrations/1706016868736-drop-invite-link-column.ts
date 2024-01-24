import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropInviteLinkColumn1706016868736 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE pm_promises DROP COLUMN invite_link;
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE pm_promises ADD COLUMN invite_link VARCHAR(255) NOT NULL AFTER title;
    `);
  }
}
