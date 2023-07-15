import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1688321455649 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    runner.query(
      [
        'CREATE TABLE `pm_users` (',
        '  `id` int unsigned not null auto_increment,',
        '  `username` varchar(80) not null,',
        '  `profile_url` text,',
        '  `provider` varchar(10) null default null,',
        '  `provider_id` varchar(20) null default null,',
        '  `created_at` timestamp not null default current_timestamp,',
        '  `updated_at` timestamp not null default current_timestamp on update current_timestamp,',
        '  `deleted_at` timestamp null default null,',
        '  primary key (`id`),',
        '  unique key `ix_provider` (`provider`, `provider_id`)',
        ') engine=InnoDB;',
      ].join('\n'),
    );
  }

  public async down(runner: QueryRunner): Promise<void> {
    runner.query('drop table if exists `pm_users`;');
  }
}
