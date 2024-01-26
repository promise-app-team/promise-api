import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'pm_locations' })
export class LocationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  city!: string;

  @Column()
  district!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ type: 'double', precision: 10, scale: 8 })
  latitude!: number;

  @Column({ type: 'double', precision: 11, scale: 8 })
  longitude!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
