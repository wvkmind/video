import { ProjectRepository } from '../repositories/ProjectRepository';
import { StoryRepository } from '../repositories/StoryRepository';
import { SceneRepository } from '../repositories/SceneRepository';
import { ShotRepository } from '../repositories/ShotRepository';
import { Project } from '../entities/Project';
import { AppDataSource } from '../config/database';

/**
 * Service for managing projects with business logic
 */
export class ProjectService {
  private projectRepository: ProjectRepository;
  private storyRepository: StoryRepository;
  private sceneRepository: SceneRepository;
  private shotRepository: ShotRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.storyRepository = new StoryRepository();
    this.sceneRepository = new SceneRepository();
    this.shotRepository = new ShotRepository();
  }

  /**
   * Create a new project
   * Validates: Requirements 1.3
   */
  async createProject(data: {
    name: string;
    type: string;
    targetDuration: number;
    targetStyle?: string;
    targetAudience?: string;
    notes?: string;
  }): Promise<Project> {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Project name is required');
    }

    if (!data.type || data.type.trim().length === 0) {
      throw new Error('Project type is required');
    }

    if (!data.targetDuration || data.targetDuration <= 0) {
      throw new Error('Target duration must be a positive number');
    }

    // Create project with default status
    const project = await this.projectRepository.create({
      name: data.name.trim(),
      type: data.type.trim(),
      targetDuration: data.targetDuration,
      targetStyle: data.targetStyle?.trim(),
      targetAudience: data.targetAudience?.trim(),
      notes: data.notes?.trim(),
      status: 'draft',
    });

    return project;
  }

  /**
   * Get a project by ID
   * Validates: Requirements 1.1
   */
  async getProject(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    return project;
  }

  /**
   * Get a project with all relations
   */
  async getProjectWithRelations(id: string): Promise<Project> {
    const project = await this.projectRepository.findByIdWithRelations(id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    return project;
  }

  /**
   * List all projects with optional filters
   * Validates: Requirements 1.1, 1.2
   */
  async listProjects(options?: {
    page?: number;
    limit?: number;
    status?: Project['status'];
    type?: string;
    searchTerm?: string;
  }): Promise<{
    data: Project[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    return this.projectRepository.findWithFilters(page, limit, {
      status: options?.status,
      type: options?.type,
      searchTerm: options?.searchTerm,
    });
  }

  /**
   * Update a project
   */
  async updateProject(
    id: string,
    data: Partial<{
      name: string;
      type: string;
      targetDuration: number;
      targetStyle: string;
      targetAudience: string;
      notes: string;
      status: Project['status'];
    }>
  ): Promise<Project> {
    // Validate project exists
    const existingProject = await this.getProject(id);

    // Validate fields if provided
    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }

    if (data.targetDuration !== undefined && data.targetDuration <= 0) {
      throw new Error('Target duration must be a positive number');
    }

    // Update project
    const updated = await this.projectRepository.update(id, data);
    if (!updated) {
      throw new Error(`Failed to update project ${id}`);
    }

    return updated;
  }

  /**
   * Duplicate a project with all related data (deep copy)
   * Validates: Requirements 1.4
   */
  async duplicateProject(id: string): Promise<Project> {
    // Use transaction to ensure all-or-nothing operation
    return AppDataSource.transaction(async (transactionalEntityManager) => {
      // Get original project with all relations
      const originalProject = await this.projectRepository.findByIdWithRelations(id);
      if (!originalProject) {
        throw new Error(`Project with id ${id} not found`);
      }

      // Create new project (without relations)
      const newProject = transactionalEntityManager.create(Project, {
        name: `${originalProject.name} (Copy)`,
        type: originalProject.type,
        targetDuration: originalProject.targetDuration,
        targetStyle: originalProject.targetStyle,
        targetAudience: originalProject.targetAudience,
        notes: originalProject.notes,
        status: 'draft', // Reset status to draft
      });

      await transactionalEntityManager.save(newProject);

      // Duplicate story if exists
      if (originalProject.story) {
        const { Story } = await import('../entities/Story');
        const newStory = transactionalEntityManager.create(Story, {
          projectId: newProject.id,
          hook: originalProject.story.hook,
          middleStructure: originalProject.story.middleStructure,
          ending: originalProject.story.ending,
          version: 1, // Reset version
        });
        await transactionalEntityManager.save(newStory);
      }

      // Duplicate scenes if exist
      const sceneIdMap = new Map<string, string>();
      if (originalProject.scenes && originalProject.scenes.length > 0) {
        const { Scene } = await import('../entities/Scene');
        for (const originalScene of originalProject.scenes) {
          const newScene = transactionalEntityManager.create(Scene, {
            projectId: newProject.id,
            sceneNumber: originalScene.sceneNumber,
            title: originalScene.title,
            description: originalScene.description,
            estimatedDuration: originalScene.estimatedDuration,
            voiceoverText: originalScene.voiceoverText,
            dialogueText: originalScene.dialogueText,
            notes: originalScene.notes,
            version: 1, // Reset version
          });
          await transactionalEntityManager.save(newScene);
          sceneIdMap.set(originalScene.id, newScene.id);
        }
      }

      // Duplicate shots if exist
      if (originalProject.shots && originalProject.shots.length > 0) {
        const { Shot } = await import('../entities/Shot');
        const shotIdMap = new Map<string, string>();

        // First pass: create all shots without previousShotId/nextShotId
        for (const originalShot of originalProject.shots) {
          const newSceneId = sceneIdMap.get(originalShot.sceneId);
          const newShot = transactionalEntityManager.create(Shot, {
            projectId: newProject.id,
            sceneId: newSceneId || originalShot.sceneId,
            shotId: originalShot.shotId,
            sequenceNumber: originalShot.sequenceNumber,
            duration: originalShot.duration,
            shotType: originalShot.shotType,
            description: originalShot.description,
            environment: originalShot.environment,
            subject: originalShot.subject,
            action: originalShot.action,
            cameraMovement: originalShot.cameraMovement,
            lighting: originalShot.lighting,
            style: originalShot.style,
            transitionType: originalShot.transitionType,
            useLastFrameAsFirst: originalShot.useLastFrameAsFirst,
            relatedVoiceover: originalShot.relatedVoiceover,
            importance: originalShot.importance,
          });
          await transactionalEntityManager.save(newShot);
          shotIdMap.set(originalShot.id, newShot.id);
        }

        // Second pass: update shot relationships
        for (const originalShot of originalProject.shots) {
          const newShotId = shotIdMap.get(originalShot.id);
          if (newShotId) {
            const updates: any = {};
            if (originalShot.previousShotId) {
              updates.previousShotId = shotIdMap.get(originalShot.previousShotId) || null;
            }
            if (originalShot.nextShotId) {
              updates.nextShotId = shotIdMap.get(originalShot.nextShotId) || null;
            }
            if (Object.keys(updates).length > 0) {
              await transactionalEntityManager.update(Shot, newShotId, updates);
            }
          }
        }
      }

      // Note: Keyframes, Clips, and Timelines are NOT duplicated
      // as they are generated content that should be regenerated for the new project

      return newProject;
    });
  }

  /**
   * Delete a project and all related data (cascade delete)
   * Validates: Requirements 1.5
   */
  async deleteProject(id: string): Promise<void> {
    // Verify project exists
    const project = await this.getProject(id);

    // Use transaction for cascade delete
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      // Delete in reverse dependency order

      // Delete keyframes (through shots)
      await transactionalEntityManager.query(
        `DELETE FROM keyframes WHERE shotId IN (SELECT id FROM shots WHERE projectId = ?)`,
        [id]
      );

      // Delete clips (through shots)
      await transactionalEntityManager.query(
        `DELETE FROM clips WHERE shotId IN (SELECT id FROM shots WHERE projectId = ?)`,
        [id]
      );

      // Delete shots
      await transactionalEntityManager.query(`DELETE FROM shots WHERE projectId = ?`, [id]);

      // Delete scenes
      await transactionalEntityManager.query(`DELETE FROM scenes WHERE projectId = ?`, [id]);

      // Delete story
      await transactionalEntityManager.query(`DELETE FROM stories WHERE projectId = ?`, [id]);

      // Delete timelines (timeline items are stored as JSON within timelines)
      await transactionalEntityManager.query(`DELETE FROM timelines WHERE projectId = ?`, [id]);

      // Delete character presets
      await transactionalEntityManager.query(
        `DELETE FROM character_presets WHERE projectId = ?`,
        [id]
      );

      // Finally delete the project
      await transactionalEntityManager.query(`DELETE FROM projects WHERE id = ?`, [id]);
    });
  }

  /**
   * Archive a project
   * Validates: Requirements 1.5
   */
  async archiveProject(id: string): Promise<Project> {
    const project = await this.updateProject(id, { status: 'archived' });
    return project;
  }

  /**
   * Count projects (useful for testing)
   */
  async countProjects(filters?: { status?: Project['status'] }): Promise<number> {
    if (filters?.status) {
      return this.projectRepository.countByStatus(filters.status);
    }
    return this.projectRepository.count();
  }
}
