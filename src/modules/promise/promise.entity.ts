import { timestamp } from '@/utils/typeorm/transformers/timestamp';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum DestinationType {
  Static = 'STATIC', // 장소 지정
  Dynamic = 'DYNAMIC', // 중간 장소
}

export enum LocationShareType {
  Distance = 'DISTANCE', // 거리 기준
  Time = 'TIME', // 시간 기준
}

@Entity({ name: 'pm_promises' })
export class PromiseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'host_id' })
  hostId!: number;

  @Column()
  title!: string;

  @Column({ name: 'destination_type' })
  destinationType!: DestinationType;

  @Column('int', { name: 'destination_id', nullable: true })
  destinationId!: number | null;

  @Column('enum', {
    name: 'location_share_start_type',
    enum: LocationShareType,
  })
  locationShareStartType!: LocationShareType;

  @Column({ name: 'location_share_start_value' })
  locationShareStartValue!: number;

  @Column('enum', { name: 'location_share_end_type', enum: LocationShareType })
  locationShareEndType!: LocationShareType;

  @Column({ name: 'location_share_end_value' })
  locationShareEndValue!: number;

  @Column('timestamp', { name: 'promised_at', transformer: timestamp })
  promisedAt!: number;

  @Column('timestamp', {
    name: 'completed_at',
    transformer: timestamp,
    nullable: true,
  })
  completedAt!: number | null;

  @Column('timestamp', { name: 'created_at', transformer: timestamp })
  createdAt!: number;

  @Column('timestamp', { name: 'updated_at', transformer: timestamp })
  updatedAt!: number;
}

@Entity({ name: 'pm_promise_users' })
export class PromiseUserEntity {
  @Column({ name: 'user_id', primary: true })
  userId!: number;

  @Column({ name: 'promise_id', primary: true })
  promiseId!: number;

  @Column('int', { name: 'start_location_id', nullable: true })
  startLocationId!: number | null;
}
