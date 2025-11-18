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

@Entity('keyframes')
@Index(['shotId', 'version'])
export class Keyframe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  shotId!: string;

  @Column({ type: 'integer' })
  version!: number;

  // Generation parameters
  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'text', nullable: true })
  negativePrompt?: string;

  @Column({ type: 'varchar', length: 100 })
  workflowName!: string;

  @Column({ type: 'integer' })
  steps!: number;

  @Column({ type: 'float' })
  cfg!: number;

  @Column({ type: 'varchar', length: 100 })
  sampler!: string;

  @Column({ type: 'integer' })
  width!: number;

  @Column({ type: 'integer' })
  height!: number;

  @Column({ type: 'bigint' })
  seed!: number;

  // Result
  @Column({ type: 'varchar', length: 500 })
  imagePath!: string;

  @Column({ type: 'boolean', default: false })
  isSelected!: boolean;

  @Column({ 
    type: 'varchar', 
    length: 50, 
    default: 'pending' 
  })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'varchar', length: 100, nullable: true })
  comfyuiTaskId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Shot, (shot) => shot.keyframes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shotId' })
  shot!: Shot;
}
