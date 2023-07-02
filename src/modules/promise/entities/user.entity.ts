import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  username!: string;

  @Column({ name: 'profile_url' })
  profileUrl!: string;

  @Column({ type: 'timestamp', name: 'created_at' })
  createdAt!: number;

  @Column({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: number;
}
