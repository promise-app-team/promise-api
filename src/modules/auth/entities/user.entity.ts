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

  @Column({ name: 'provider_id', nullable: true })
  providerId!: string | null;

  @Column('timestamp', { name: 'created_at' })
  createdAt!: number;

  @Column('timestamp', { name: 'updated_at' })
  updatedAt!: number;

  @Column({
    type: 'timestamp',
    name: 'deleted_at',
    nullable: true,
    select: false,
  })
  deletedAt?: number | null;
}
