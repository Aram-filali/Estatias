import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Property } from './property.entity';

export type SyncStatus = 'PENDING' | 'STARTED' | 'SUCCESS' | 'ERROR' | 'CRITICAL_ERROR' | 'CANCELLED';

@Entity()
export class SyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  propertyId: number;

  @Column()
  platform: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'STARTED', 'SUCCESS', 'ERROR', 'CRITICAL_ERROR', 'CANCELLED'],
    default: 'PENDING'
  })
  status: SyncStatus;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ nullable: true })
  availabilitiesUpdated: number;

  @Column({ nullable: true })
  captchaEncountered: boolean;

  @Column({ nullable: true })
  executionTimeMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @ManyToOne(() => Property, property => property.syncLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;
}