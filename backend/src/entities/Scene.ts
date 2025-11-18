import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from './Project';
import { Shot } from './Shot';

@Entity('scenes')
export class Scene {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'integer' })
  sceneNumber!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'integer', default: 0 })
  estimatedDuration!: number;

  @Column({ type: 'text', nullable: true })
  voiceoverText?: string;

  @Column({ type: 'text', nullable: true })
  dialogueText?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.scenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @OneToMany(() => Shot, (shot) => shot.scene)
  shots?: Shot[];
}
