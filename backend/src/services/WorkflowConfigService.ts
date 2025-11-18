import * as fs from 'fs';
import * as path from 'path';
import { WorkflowConfigRepository } from '../repositories/WorkflowConfigRepository';
import { WorkflowConfig } from '../entities/WorkflowConfig';
import {
  validateWorkflowConfig,
  WorkflowConfigSchema,
} from '../schemas/workflowConfigSchema';

export class WorkflowConfigService {
  private repository: WorkflowConfigRepository;
  private workflowsDir: string;

  constructor() {
    this.repository = new WorkflowConfigRepository();
    this.workflowsDir = path.join(__dirname, '../../workflows');
  }

  /**
   * Load workflow configurations from JSON files in the workflows directory
   * and save them to the database
   */
  async loadConfigs(): Promise<{
    loaded: number;
    failed: number;
    errors: Array<{ file: string; errors: string[] }>;
  }> {
    const result = {
      loaded: 0,
      failed: 0,
      errors: [] as Array<{ file: string; errors: string[] }>,
    };

    try {
      // Check if workflows directory exists
      if (!fs.existsSync(this.workflowsDir)) {
        console.warn(`Workflows directory not found: ${this.workflowsDir}`);
        return result;
      }

      // Read all JSON files from workflows directory
      const files = fs
        .readdirSync(this.workflowsDir)
        .filter((file) => file.endsWith('.json'));

      for (const file of files) {
        try {
          const filePath = path.join(this.workflowsDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const config = JSON.parse(fileContent) as WorkflowConfigSchema;

          // Validate configuration
          const validation = validateWorkflowConfig(config);
          if (!validation.valid) {
            result.failed++;
            result.errors.push({
              file,
              errors: validation.errors,
            });
            console.error(
              `Validation failed for ${file}:`,
              validation.errors
            );
            continue;
          }

          // Check if workflow already exists
          const existing = await this.repository.findByName(config.name);

          if (existing) {
            // Update existing workflow
            existing.displayName = config.displayName;
            existing.type = config.type;
            existing.workflowJSON = config.workflowJSON;
            existing.parameters = config.parameters;
            existing.isActive = config.isActive ?? true;
            await this.repository.update(existing.id, existing);
          } else {
            // Create new workflow
            const workflow = new WorkflowConfig();
            workflow.name = config.name;
            workflow.displayName = config.displayName;
            workflow.type = config.type;
            workflow.workflowJSON = config.workflowJSON;
            workflow.parameters = config.parameters;
            workflow.isActive = config.isActive ?? true;
            await this.repository.create(workflow);
          }

          result.loaded++;
          console.log(`Loaded workflow: ${config.name} from ${file}`);
        } catch (error) {
          result.failed++;
          result.errors.push({
            file,
            errors: [
              error instanceof Error ? error.message : 'Unknown error',
            ],
          });
          console.error(`Failed to load workflow from ${file}:`, error);
        }
      }

      console.log(
        `Workflow loading complete: ${result.loaded} loaded, ${result.failed} failed`
      );
      return result;
    } catch (error) {
      console.error('Error loading workflow configs:', error);
      throw error;
    }
  }

  /**
   * Get a workflow by name
   */
  async getWorkflow(name: string): Promise<WorkflowConfig | null> {
    return this.repository.findByName(name);
  }

  /**
   * List all active workflows
   */
  async listWorkflows(type?: string): Promise<WorkflowConfig[]> {
    if (type) {
      if (
        !['text_to_image', 'image_to_video', 'text_to_video'].includes(type)
      ) {
        throw new Error(
          'Invalid workflow type. Must be one of: text_to_image, image_to_video, text_to_video'
        );
      }
      return this.repository.findByType(
        type as 'text_to_image' | 'image_to_video' | 'text_to_video'
      );
    }
    return this.repository.findAllActive();
  }

  /**
   * Validate a workflow configuration
   */
  validateConfig(
    config: WorkflowConfigSchema
  ): { valid: boolean; errors: string[] } {
    return validateWorkflowConfig(config);
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<WorkflowConfig | null> {
    return this.repository.findById(id);
  }

  /**
   * Activate or deactivate a workflow
   */
  async setWorkflowActive(
    id: string,
    isActive: boolean
  ): Promise<WorkflowConfig> {
    return this.repository.setActive(id, isActive);
  }

  /**
   * Create a new workflow configuration
   */
  async createWorkflow(
    config: WorkflowConfigSchema
  ): Promise<WorkflowConfig> {
    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(
        `Invalid workflow configuration: ${validation.errors.join(', ')}`
      );
    }

    // Check if workflow with same name already exists
    const existing = await this.repository.findByName(config.name);
    if (existing) {
      throw new Error(`Workflow with name '${config.name}' already exists`);
    }

    // Create workflow entity
    const workflow = new WorkflowConfig();
    workflow.name = config.name;
    workflow.displayName = config.displayName;
    workflow.type = config.type;
    workflow.workflowJSON = config.workflowJSON;
    workflow.parameters = config.parameters;
    workflow.isActive = config.isActive ?? true;

    return this.repository.create(workflow);
  }

  /**
   * Update an existing workflow configuration
   */
  async updateWorkflow(
    id: string,
    config: Partial<WorkflowConfigSchema>
  ): Promise<WorkflowConfig> {
    const workflow = await this.repository.findById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Update fields
    if (config.displayName !== undefined) {
      workflow.displayName = config.displayName;
    }
    if (config.type !== undefined) {
      workflow.type = config.type;
    }
    if (config.workflowJSON !== undefined) {
      workflow.workflowJSON = config.workflowJSON;
    }
    if (config.parameters !== undefined) {
      workflow.parameters = config.parameters;
    }
    if (config.isActive !== undefined) {
      workflow.isActive = config.isActive;
    }

    // Validate updated configuration
    const validation = this.validateConfig(workflow as WorkflowConfigSchema);
    if (!validation.valid) {
      throw new Error(
        `Invalid workflow configuration: ${validation.errors.join(', ')}`
      );
    }

    const updated = await this.repository.update(id, workflow);
    if (!updated) {
      throw new Error('Failed to update workflow');
    }
    return updated;
  }

  /**
   * Delete a workflow configuration
   */
  async deleteWorkflow(id: string): Promise<void> {
    const workflow = await this.repository.findById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await this.repository.delete(id);
  }
}
