import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shot } from './Shot';

@Entity('clips')
@Index(['shotId', 'version'])
export class Clip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  shotId!: string;

  @Column({ type: 'integer' })
  version!: number;

  // Input
  @Column({ type: 'varchar', length: 50 })
  inputMode!: 'image_to_video' | 'text_to_video';

  @Column({ type: 'uuid', nullable: true })
  keyframeId?: string;

  @Column({ type: 'text' })
  prompt!: string;

  // Generation parameters
  @Column({ type: 'varchar', length: 100 })
  workflowName!: string;

  @Column({ type: 'float' })
  duration!: number;

  @Column({ type: 'integer' })
  fps!: number;

  @Column({ type: 'integer' })
  width!: number;

  @Column({ type: 'integer' })
  height!: number;

  @Column({ type: 'integer' })
  steps!: number;

  @Column({ type: 'float' })
  guidance!: number;

  @Column({ type: 'float' })
  cfg!: number;

  @Column({ type: 'bigint' })
  seed!: number;

  // Transition control
  @Column({ type: 'boolean', default: false })
  useLastFrameReference!: boolean;

  @Column({ type: 'uuid', nullable: true })
  referenceClipId?: string;

  @Column({ type: 'integer', nullable: true })
  referenceFrameNumber?: number;

  // Mode
  @Column({ type: 'varchar', length: 50, default: 'demo' })
  mode!: 'demo' | 'production';

  // Result
  @Column({ type: 'varchar', length: 500, nullable: true })
  videoPath?: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'varchar', length: 100, nullable: true })
  comfyuiTaskId?: string;

  @Column({ type: 'boolean', default: false })
  isSelected!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  // Relations
  @ManyToOne(() => Shot, (shot) => shot.clips, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shotId' })
  shot!: Shot;
}
