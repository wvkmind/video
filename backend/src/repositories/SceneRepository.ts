import { AppDataSource } from '../config/database';
import { Scene } from '../entities/Scene';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for Scene entity with CRUD operations
 */
export class SceneRepository extends BaseRepository<Scene> {
  constructor() {
    super(AppDataSource.getRepository(Scene));
  }

  /**
   * Find all scenes for a project
   */
  async findByProjectId(projectId: string): Promise<Scene[]> {
    return this.repository.find({
      where: { projectId },
      order: { sceneNumber: 'ASC' },
      relations: ['shots'],
    });
  }

  /**
   * Find scene by project ID and scene number
   */
  async findByProjectIdAndSceneNumber(projectId: string, sceneNumber: number): Promise<Scene | null> {
    return this.repository.findOne({
      where: { projectId, sceneNumber },
    });
  }

  /**
   * Find scene with all shots
   */
  async findByIdWithShots(id: string): Promise<Scene | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['shots', 'project'],
    });
  }

  /**
   * Get all versions of a scene
   */
  async findVersions(projectId: string, sceneNumber: number): Promise<Scene[]> {
    return this.repository.find({
      where: { projectId, sceneNumber },
      order: { version: 'DESC' },
    });
  }

  /**
   * Get the latest version number for a scene
   */
  async getLatestVersion(projectId: string, sceneNumber: number): Promise<number> {
    const scene = await this.repository.findOne({
      where: { projectId, sceneNumber },
      order: { version: 'DESC' },
    });
    return scene?.version ?? 0;
  }

  /**
   * Create a new version of a scene
   */
  async createVersion(id: string, data: Partial<Scene>): Promise<Scene> {
    const currentScene = await this.findById(id);
    if (!currentScene) {
      throw new Error('Scene not found');
    }

    const latestVersion = await this.getLatestVersion(currentScene.projectId, currentScene.sceneNumber);

    return this.create({
      ...currentScene,
      ...data,
      version: latestVersion + 1,
    });
  }

  /**
   * Get next scene number for a project
   */
  async getNextSceneNumber(projectId: string): Promise<number> {
    const lastScene = await this.repository.findOne({
      where: { projectId },
      order: { sceneNumber: 'DESC' },
    });
    return (lastScene?.sceneNumber ?? 0) + 1;
  }

  /**
   * Count scenes in a project
   */
  async countByProjectId(projectId: string): Promise<number> {
    return this.repository.count({ where: { projectId } });
  }

  /**
   * Find scenes with pagination for a project
   */
  async findByProjectIdWithPagination(
    projectId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: Scene[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: { projectId },
      order: { sceneNumber: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update scene voiceover (increments version)
   */
  async updateVoiceover(id: string, voiceoverText: string): Promise<Scene> {
    const scene = await this.findById(id);
    if (!scene) {
      throw new Error('Scene not found');
    }

    const updated = await this.update(id, {
      voiceoverText,
      version: scene.version + 1,
    });

    return updated!;
  }
}
