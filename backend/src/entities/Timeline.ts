import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './Project';

export interface TimelineTrack {
  trackId: string;
  trackType: 'video' | 'audio';
  items: TimelineItem[];
}

export interface TimelineItem {
  itemId: string;
  clipId: string;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  transitionType: 'cut' | 'dissolve' | 'fade' | null;
  transitionDuration: number;
}

@Entity('timelines')
@Index(['projectId', 'version'])
export class Timeline {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'integer' })
  version!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  versionName?: string;

  // Track configuration stored as JSON
  @Column({ type: 'json' })
  tracks!: TimelineTrack[];

  // Audio
  @Column({ type: 'varchar', length: 500, nullable: true })
  voiceoverAudioPath?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bgmAudioPath?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'draft',
  })
  status!: 'draft' | 'generated' | 'locked';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.timelines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;
}
