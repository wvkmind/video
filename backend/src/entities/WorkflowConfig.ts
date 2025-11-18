import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface WorkflowParameter {
  name: string;
  displayName: string;
  type: 'number' | 'string' | 'select';
  defaultValue: any;
  options?: any[];
  nodeId: string;
  fieldPath: string;
}

@Entity('workflow_configs')
export class WorkflowConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  displayName!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: 'text_to_image' | 'image_to_video' | 'text_to_video';

  @Column({ type: 'json' })
  workflowJSON!: object;

  @Column({ type: 'json' })
  parameters!: WorkflowParameter[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
