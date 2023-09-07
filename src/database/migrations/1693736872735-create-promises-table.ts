import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromisesTable1693736872735 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      [
        'create table `pm_promises` (',
        '  `id` int unsigned not null auto_increment,',
        '  `host_id` int unsigned not null,',
        '  `title` varchar(20) not null,',
        '  `invite_link` text,',
        '  `destination_type` varchar(10) not null,',
        '  `destination_id` int unsigned null,',
        '  `location_share_start_type` varchar(10) not null,',
        '  `location_share_start_value` int unsigned not null,',
        '  `location_share_end_type` varchar(10) not null,',
        '  `location_share_end_value` int unsigned not null,',
        '  `promised_at` timestamp not null,',
        '  `completed_at` timestamp null default null,',
        '  `created_at` timestamp not null default current_timestamp,',
        '  `updated_at` timestamp not null default current_timestamp on update current_timestamp,',
        '  primary key (`id`),',
        '  index `ix_host` (`host_id`),',
        '  index `ix_destination` (`destination_id`),',
        '  unique `ix_id_host` (`id`, `host_id`)',
        ') engine=InnoDB;',
      ].join('\n'),
    );

    await runner.query(
      [
        'create table `pm_promise_users` (',
        '  `user_id` int unsigned not null,',
        '  `promise_id` int unsigned not null,',
        '  `start_location_id` int unsigned null,',
        '  primary key (`user_id`, `promise_id`),',
        '  index `start_location_id` (`start_location_id`)',
        ') engine=InnoDB;',
      ].join('\n'),
    );

    await runner.query(
      [
        'create table `pm_themes` (',
        '  `id` int unsigned not null auto_increment,',
        '  `theme` varchar(10) not null,',
        '  primary key (`id`)',
        ') engine=InnoDB;',
      ].join('\n'),
    );

    const themes = [
      '연인',
      '친구',
      '동료',
      '가족',
      '지인',
      '스터디',
      '썸',
      '동아리',
      '동호회',
      '모임',
      '모르는 사람',
    ];
    await runner.query(
      [
        'insert into `pm_themes` (`theme`) values',
        themes.map((theme) => `('${theme}')`).join(','),
      ].join('\n'),
    );

    await runner.query(
      [
        'create table `pm_promise_themes` (',
        '  `promise_id` int unsigned not null,',
        '  `theme_id` int unsigned not null,',
        '  primary key (`promise_id`, `theme_id`)',
        ') engine=InnoDB;',
      ].join('\n'),
    );

    await runner.query(
      [
        'create table `pm_locations` (',
        '  `id` int unsigned not null auto_increment,',
        '  `city` varchar(10) not null,',
        '  `district` varchar(10) not null,',
        '  `address` varchar(50) not null,',
        '  `latitude` double(10, 8) not null,',
        '  `longitude` double(11, 8) not null,',
        '  `created_at` timestamp not null default current_timestamp,',
        '  `updated_at` timestamp not null default current_timestamp on update current_timestamp,',
        '  primary key (`id`)',
        ') engine=InnoDB;',
      ].join('\n'),
    );
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query('drop table if exists `pm_promises`;');
    await runner.query('drop table if exists `pm_promise_users`;');
    await runner.query('drop table if exists `pm_themes`;');
    await runner.query('drop table if exists `pm_promise_themes`;');
    await runner.query('drop table if exists `pm_locations`;');
  }
}
