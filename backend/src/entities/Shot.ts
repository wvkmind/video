import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Project } from './Project';
import { Scene } from './Scene';
import { Keyframe } from './Keyframe';
import { Clip } from './Clip';

@Entity('shots')
@Index(['projectId', 'sequenceNumber'])
@Index(['sceneId', 'sequenceNumber'])
export class Shot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'uuid' })
  sceneId!: string;

  @Column({ type: 'varchar', length: 50 })
  shotId!: string;

  @Column({ type: 'integer' })
  sequenceNumber!: number;

  @Column({ type: 'float', default: 0 })
  duration!: number;

  @Column({ type: 'varchar', length: 50 })
  shotType!: 'wide' | 'medium' | 'closeup' | 'transition';

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Visual elements
  @Column({ type: 'text', nullable: true })
  environment?: string;

  @Column({ type: 'text', nullable: true })
  subject?: string;

  @Column({ type: 'text', nullable: true })
  action?: string;

  @Column({ type: 'text', nullable: true })
  cameraMovement?: string;

  @Column({ type: 'text', nullable: true })
  lighting?: string;

  @Column({ type: 'text', nullable: true })
  style?: string;

  // Transition information
  @Column({ type: 'uuid', nullable: true })
  previousShotId?: string;

  @Column({ type: 'uuid', nullable: true })
  nextShotId?: string;

  @Column({ type: 'varchar', length: 50, default: 'cut' })
  transitionType!: 'cut' | 'dissolve' | 'motion';

  @Column({ type: 'boolean', default: false })
  useLastFrameAsFirst!: boolean;

  // Related content
  @Column({ type: 'text', nullable: true })
  relatedVoiceover?: string;

  @Column({ type: 'varchar', length: 50, default: 'medium' })
  importance!: 'high' | 'medium' | 'low';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.shots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @ManyToOne(() => Scene, (scene) => scene.shots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sceneId' })
  scene!: Scene;

  @OneToMany(() => Keyframe, (keyframe) => keyframe.shot)
  keyframes?: Keyframe[];

  @OneToMany(() => Clip, (clip) => clip.shot)
  clips?: Clip[];
}
