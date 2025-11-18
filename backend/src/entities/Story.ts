import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './Project';

@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'text', nullable: true })
  hook?: string;

  @Column({ type: 'text', nullable: true })
  middleStructure?: string;

  @Column({ type: 'text', nullable: true })
  ending?: string;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToOne(() => Project, (project) => project.story)
  @JoinColumn({ name: 'projectId' })
  project!: Project;
}
