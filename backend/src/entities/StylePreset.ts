import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('style_presets')
@Index(['projectId'])
export class StylePreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  promptPrefix?: string;

  @Column({ type: 'text', nullable: true })
  promptSuffix?: string;

  @Column({ type: 'text', nullable: true })
  negativePrompt?: string;

  // Default parameters
  @Column({ type: 'integer', nullable: true })
  defaultSteps?: number;

  @Column({ type: 'float', nullable: true })
  defaultCfg?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  defaultSampler?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
