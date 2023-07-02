import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'pm_users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  username!: string;

  @Column({ name: 'profile_url', nullable: true })
  profileUrl!: string;

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt!: number;

  @Column({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: number;

  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt?: number;
}
