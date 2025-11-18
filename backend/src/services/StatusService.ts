import { StoryRepository } from '../repositories/StoryRepository';
import { SceneRepository } from '../repositories/SceneRepository';
import { ShotRepository } from '../repositories/ShotRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import {
  EntityStatus,
  ProjectStatus,
  isValidEntityStatusTransition,
  isValidProjectStatusTransition,
  isValidEntityStatus,
  isValidProjectStatus,
} from '../utils/statusUtils';

/**
 * Service for managing entity status transitions
 * Validates: Requirements 8.5
 */
export class StatusService {
  private storyRepository: StoryRepository;
  private sceneRepository: SceneRepository;
  private shotRepository: ShotRepository;
  private projectRepository: ProjectRepository;

  constructor() {
    this.storyRepository = new StoryRepository();
    this.sceneRepository = new SceneRepository();
    this.shotRepository = new ShotRepository();
    this.projectRepository = new ProjectRepository();
  }

  /**
   * Update story status with validation
   */
  async updateStoryStatus(storyId: string, newStatus: string): Promise<void> {
    if (!isValidEntityStatus(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: draft, generated, locked`);
    }

    const story = await this.storyRepository.findById(storyId);
    if (!story) {
      throw new Error(`Story with id ${storyId} not found`);
    }

    if (!isValidEntityStatusTransition(story.status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${story.status} to ${newStatus}`
      );
    }

    await this.storyRepository.update(storyId, { status: newStatus });
  }

  /**
   * Update scene status with validation
   */
  async updateSceneStatus(sceneId: string, newStatus: string): Promise<void> {
    if (!isValidEntityStatus(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: draft, generated, locked`);
    }

    const scene = await this.sceneRepository.findById(sceneId);
    if (!scene) {
      throw new Error(`Scene with id ${sceneId} not found`);
    }

    if (!isValidEntityStatusTransition(scene.status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${scene.status} to ${newStatus}`
      );
    }

    await this.sceneRepository.update(sceneId, { status: newStatus });
  }

  /**
   * Update shot status with validation
   */
  async updateShotStatus(shotId: string, newStatus: string): Promise<void> {
    if (!isValidEntityStatus(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: draft, generated, locked`);
    }

    const shot = await this.shotRepository.findById(shotId);
    if (!shot) {
      throw new Error(`Shot with id ${shotId} not found`);
    }

    if (!isValidEntityStatusTransition(shot.status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${shot.status} to ${newStatus}`
      );
    }

    await this.shotRepository.update(shotId, { status: newStatus });
  }

  /**
   * Update project status with validation
   */
  async updateProjectStatus(projectId: string, newStatus: string): Promise<void> {
    if (!isValidProjectStatus(newStatus)) {
      throw new Error(
        `Invalid status: ${newStatus}. Must be one of: draft, in_progress, completed, archived`
      );
    }

    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    if (!isValidProjectStatusTransition(project.status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${project.status} to ${newStatus}`
      );
    }

    await this.projectRepository.update(projectId, { status: newStatus });
  }

  /**
   * Batch update status for multiple entities
   */
  async batchUpdateShotStatus(shotIds: string[], newStatus: string): Promise<void> {
    if (!isValidEntityStatus(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: draft, generated, locked`);
    }

    for (const shotId of shotIds) {
      await this.updateShotStatus(shotId, newStatus);
    }
  }

  /**
   * Get all valid transitions for an entity's current status
   */
  getValidTransitions(
    entityType: 'story' | 'scene' | 'shot' | 'project',
    currentStatus: EntityStatus | ProjectStatus
  ): string[] {
    if (entityType === 'project') {
      const transitions: Record<ProjectStatus, ProjectStatus[]> = {
        draft: ['in_progress', 'archived'],
        in_progress: ['completed', 'draft', 'archived'],
        completed: ['archived', 'in_progress'],
        archived: ['draft'],
      };
      return transitions[currentStatus as ProjectStatus] || [];
    } else {
      const transitions: Record<EntityStatus, EntityStatus[]> = {
        draft: ['generated', 'locked'],
        generated: ['draft', 'locked'],
        locked: ['draft'],
      };
      return transitions[currentStatus as EntityStatus] || [];
    }
  }
}
