import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Story } from './Story';
import { Scene } from './Scene';
import { Shot } from './Shot';
import { Timeline } from './Timeline';
import { CharacterPreset } from './CharacterPreset';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  type!: string;

  @Column({ type: 'integer' })
  targetDuration!: number;

  @Column({ type: 'text', nullable: true })
  targetStyle?: string;

  @Column({ type: 'text', nullable: true })
  targetAudience?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'draft',
  })
  status!: 'draft' | 'in_progress' | 'completed' | 'archived';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToOne(() => Story, (story) => story.project)
  story?: Story;

  @OneToMany(() => Scene, (scene) => scene.project)
  scenes?: Scene[];

  @OneToMany(() => Shot, (shot) => shot.project)
  shots?: Shot[];

  @OneToMany(() => Timeline, (timeline) => timeline.project)
  timelines?: Timeline[];

  @OneToMany(() => CharacterPreset, (character) => character.project)
  characters?: CharacterPreset[];
}
