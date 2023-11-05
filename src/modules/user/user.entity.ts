import { timestamp } from '@/utils/typeorm/transformers/timestamp';
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column('timestamp', { name: 'created_at', transformer: timestamp })
  createdAt!: number;

  @Column('timestamp', { name: 'updated_at', transformer: timestamp })
  updatedAt!: number;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  @Column('timestamp', { name: 'last_signed_at', transformer: timestamp })
  lastSignedAt!: number;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  @Column('timestamp', { name: 'deleted_at', transformer: timestamp })
  deletedAt?: number | null;
}
