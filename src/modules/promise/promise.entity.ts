import { DateColumn } from '@/common/decorators/date-column.decorator';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @DateColumn({ name: 'promised_at' })
  promisedAt!: Date;

  @DateColumn({ name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
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
