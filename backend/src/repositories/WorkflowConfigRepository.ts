import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { WorkflowConfig } from '../entities/WorkflowConfig';
import { BaseRepository } from './BaseRepository';

export class WorkflowConfigRepository extends BaseRepository<WorkflowConfig> {
  constructor() {
    super(AppDataSource.getRepository(WorkflowConfig));
  }

  /**
   * Find workflow by name
   */
  async findByName(name: string): Promise<WorkflowConfig | null> {
    return this.repository.findOne({
      where: { name, isActive: true },
    });
  }

  /**
   * Find all active workflows
   */
  async findAllActive(): Promise<WorkflowConfig[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find workflows by type
   */
  async findByType(
    type: 'text_to_image' | 'image_to_video' | 'text_to_video'
  ): Promise<WorkflowConfig[]> {
    return this.repository.find({
      where: { type, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Activate or deactivate a workflow
   */
  async setActive(id: string, isActive: boolean): Promise<WorkflowConfig> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.isActive = isActive;
    return this.repository.save(workflow);
  }
}
