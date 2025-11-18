import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Version entity for tracking historical versions of any entity
 * Supports versioning for Story, Scene, Shot, Keyframe, Clip, Timeline
 */
@Entity('versions')
@Index(['entityType', 'entityId', 'versionNumber'])
export class Version {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Entity identification
  @Column({ type: 'varchar', length: 50 })
  entityType!: 'story' | 'scene' | 'shot' | 'keyframe' | 'clip' | 'timeline';

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'integer' })
  versionNumber!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  versionName?: string;

  // Snapshot of entity data at this version
  @Column({ type: 'json' })
  snapshot!: Record<string, any>;

  // Optional change summary
  @Column({ type: 'text', nullable: true })
  changeSummary?: string;

  // User who created this version (optional, for future multi-user support)
  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
