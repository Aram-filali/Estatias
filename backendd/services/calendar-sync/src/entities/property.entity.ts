import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Availability } from './availability.entity';
import { SyncLog } from './sync-log.entity';

@Entity()
export class Property {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  siteId: string;

  @Column({ nullable: false })
  platform: string;

  @Column({ nullable: false })
  propertyUrl: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ default: false })
  active: boolean;

  @Column({ nullable: true, type: 'datetime' })
  lastSynced: Date;

  @Column({ nullable: true })
  syncFrequency: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Availability, availability => availability.property)
  availabilities: Availability[];

  @OneToMany(() => SyncLog, syncLog => syncLog.property)
  syncLogs: SyncLog[];
}