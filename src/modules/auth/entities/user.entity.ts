import { timestamp } from '@/utils/typeorm/transformers/timestamp';
import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum Provider {
  Kakao = 'KAKAO',
  Google = 'GOOGLE',
  Apple = 'APPLE',
}

@Entity({ name: 'pm_users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  username!: string | null;

  @Column({ name: 'profile_url', nullable: true })
  profileUrl!: string | null;

  @Column('enum', { enum: Provider, nullable: true })
  provider!: Provider | null;

  @ApiHideProperty()
  @Column({ name: 'provider_id', nullable: true })
  providerId!: string | null;

  @Column('timestamp', { name: 'created_at', transformer: timestamp })
  createdAt!: number;

  @Column('timestamp', { name: 'updated_at', transformer: timestamp })
  updatedAt!: number;

  @ApiHideProperty()
  @Column('timestamp', {
    name: 'last_signed_at',
    transformer: timestamp,
    select: false,
  })
  lastSignedAt!: number;

  @ApiHideProperty()
  @Column({
    name: 'deleted_at',
    transformer: timestamp,
    select: false,
  })
  deletedAt?: number | null;
}
