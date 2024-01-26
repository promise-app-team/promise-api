import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { DateColumn } from '../common/decorators/date-column.decorator';

export enum Provider {
  Kakao = 'KAKAO',
  Google = 'GOOGLE',
  Apple = 'APPLE',
}

@Entity({ name: 'pm_users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar', { nullable: true })
  username!: string | null;

  @Column('varchar', { name: 'profile_url', nullable: true })
  profileUrl!: string | null;

  @Column('enum', { enum: Provider, nullable: true })
  provider!: Provider | null;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  @Column('varchar', { name: 'provider_id', nullable: true })
  providerId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  @DateColumn({ name: 'last_signed_at' })
  lastSignedAt!: Date;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  @Column('varchar', { name: 'leave_reason', nullable: true })
  leaveReason?: string | null;
}
