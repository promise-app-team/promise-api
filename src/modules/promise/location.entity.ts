import { timestamp } from '@/utils/typeorm/transformers/timestamp';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'pm_locations' })
export class LocationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  city!: string;

  @Column()
  district!: string;

  @Column()
  address!: string;

  @Column({ type: 'double', precision: 10, scale: 8 })
  latitude!: number;

  @Column({ type: 'double', precision: 11, scale: 8 })
  longitude!: number;

  @Column('timestamp', { name: 'created_at', transformer: timestamp })
  createdAt!: number;

  @Column('timestamp', { name: 'updated_at', transformer: timestamp })
  updatedAt!: number;
}
