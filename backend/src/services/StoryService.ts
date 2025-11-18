import { StoryRepository } from '../repositories/StoryRepository';
import { SceneRepository } from '../repositories/SceneRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { Story } from '../entities/Story';
import { Scene } from '../entities/Scene';

/**
 * Service for managing stories and scenes with business logic
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */
export class StoryService {
  private storyRepository: StoryRepository;
  private sceneRepository: SceneRepository;
  private projectRepository: ProjectRepository;

  constructor() {
    this.storyRepository = new StoryRepository();
    this.sceneRepository = new SceneRepository();
    this.projectRepository = new ProjectRepository();
  }

  /**
   * Get story for a project
   * Validates: Requirements 2.1
   */
  async getStory(projectId: string): Promise<Story | null> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    return this.storyRepository.findByProjectId(projectId);
  }

  /**
   * Update story outline (creates new version)
   * Validates: Requirements 2.2
   */
  async updateStory(
    projectId: string,
    data: {
      hook?: string;
      middleStructure?: string;
      ending?: string;
    }
  ): Promise<Story> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    // Update story (repository handles versioning)
    return this.storyRepository.updateStory(projectId, data);
  }

  /**
   * Get all versions of a story
   */
  async getStoryVersions(projectId: string): Promise<Story[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    return this.storyRepository.findVersionsByProjectId(projectId);
  }

  /**
   * Create a new scene
   * Validates: Requirements 2.3
   */
  async createScene(
    projectId: string,
    data: {
      title: string;
      description?: string;
      estimatedDuration?: number;
      voiceoverText?: string;
      dialogueText?: string;
      notes?: string;
    }
  ): Promise<Scene> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Scene title is required');
    }

    if (data.estimatedDuration !== undefined && data.estimatedDuration < 0) {
      throw new Error('Estimated duration must be non-negative');
    }

    // Get next scene number
    const sceneNumber = await this.sceneRepository.getNextSceneNumber(projectId);

    // Create scene
    return this.sceneRepository.create({
      projectId,
      sceneNumber,
      title: data.title.trim(),
      description: data.description?.trim(),
      estimatedDuration: data.estimatedDuration || 0,
      voiceoverText: data.voiceoverText?.trim(),
      dialogueText: data.dialogueText?.trim(),
      notes: data.notes?.trim(),
      version: 1,
    });
  }

  /**
   * Get a scene by ID
   */
  async getScene(id: string): Promise<Scene> {
    const scene = await this.sceneRepository.findById(id);
    if (!scene) {
      throw new Error(`Scene with id ${id} not found`);
    }
    return scene;
  }

  /**
   * Get all scenes for a project
   */
  async getScenes(projectId: string): Promise<Scene[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    return this.sceneRepository.findByProjectId(projectId);
  }

  /**
   * Update a scene (creates new version if voiceover changes)
   * Validates: Requirements 2.3, 2.4
   */
  async updateScene(
    id: string,
    data: {
      title?: string;
      description?: string;
      estimatedDuration?: number;
      voiceoverText?: string;
      dialogueText?: string;
      notes?: string;
    }
  ): Promise<Scene> {
    // Get existing scene
    const scene = await this.getScene(id);

    // Validate fields if provided
    if (data.title !== undefined && data.title.trim().length === 0) {
      throw new Error('Scene title cannot be empty');
    }

    if (data.estimatedDuration !== undefined && data.estimatedDuration < 0) {
      throw new Error('Estimated duration must be non-negative');
    }

    // Check if voiceover is being changed (triggers versioning)
    const voiceoverChanged =
      data.voiceoverText !== undefined && data.voiceoverText !== scene.voiceoverText;

    // Prepare update data
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.estimatedDuration !== undefined) updateData.estimatedDuration = data.estimatedDuration;
    if (data.voiceoverText !== undefined) updateData.voiceoverText = data.voiceoverText.trim();
    if (data.dialogueText !== undefined) updateData.dialogueText = data.dialogueText.trim();
    if (data.notes !== undefined) updateData.notes = data.notes.trim();

    // If voiceover changed, increment version
    if (voiceoverChanged) {
      updateData.version = scene.version + 1;
    }

    // Update scene
    const updated = await this.sceneRepository.update(id, updateData);
    if (!updated) {
      throw new Error(`Failed to update scene ${id}`);
    }

    return updated;
  }

  /**
   * Delete a scene
   */
  async deleteScene(id: string): Promise<void> {
    // Verify scene exists
    const scene = await this.getScene(id);

    // Delete scene (cascade delete will handle shots)
    await this.sceneRepository.delete(id);
  }

  /**
   * Get all versions of a scene
   * Validates: Requirements 2.4
   */
  async getSceneVersions(id: string): Promise<Scene[]> {
    // Get scene to get projectId and sceneNumber
    const scene = await this.getScene(id);

    return this.sceneRepository.findVersions(scene.projectId, scene.sceneNumber);
  }

  /**
   * Get scene with all shots
   */
  async getSceneWithShots(id: string): Promise<Scene> {
    const scene = await this.sceneRepository.findByIdWithShots(id);
    if (!scene) {
      throw new Error(`Scene with id ${id} not found`);
    }
    return scene;
  }
}
