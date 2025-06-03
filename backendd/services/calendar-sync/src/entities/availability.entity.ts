import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Property } from './property.entity';

@Entity()
export class Availability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  propertyId: number;

  @Column({ type: 'date' })
  @Index()
  date: string;

  @Column()
  isAvailable: boolean;

  @Column()
  source: string;

  @Column({ type: 'datetime' })
  lastUpdated: Date;

  @Column({ nullable: true })
  price: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  minimumStay: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Property, property => property.availabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;
}