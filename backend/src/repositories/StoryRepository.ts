import { AppDataSource } from '../config/database';
import { Story } from '../entities/Story';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for Story entity with CRUD operations
 */
export class StoryRepository extends BaseRepository<Story> {
  constructor() {
    super(AppDataSource.getRepository(Story));
  }

  /**
   * Find story by project ID
   */
  async findByProjectId(projectId: string): Promise<Story | null> {
    return this.repository.findOne({
      where: { projectId },
      relations: ['project'],
    });
  }

  /**
   * Find story by project ID with specific version
   */
  async findByProjectIdAndVersion(projectId: string, version: number): Promise<Story | null> {
    return this.repository.findOne({
      where: { projectId, version },
    });
  }

  /**
   * Get all versions of a story for a project
   */
  async findVersionsByProjectId(projectId: string): Promise<Story[]> {
    return this.repository.find({
      where: { projectId },
      order: { version: 'DESC' },
    });
  }

  /**
   * Get the latest version number for a project's story
   */
  async getLatestVersion(projectId: string): Promise<number> {
    const story = await this.repository.findOne({
      where: { projectId },
      order: { version: 'DESC' },
    });
    return story?.version ?? 0;
  }

  /**
   * Create a new version of a story
   */
  async createVersion(projectId: string, data: Partial<Story>): Promise<Story> {
    const latestVersion = await this.getLatestVersion(projectId);
    return this.create({
      ...data,
      projectId,
      version: latestVersion + 1,
    });
  }

  /**
   * Update story content (increments version)
   */
  async updateStory(
    projectId: string,
    data: { hook?: string; middleStructure?: string; ending?: string }
  ): Promise<Story> {
    const currentStory = await this.findByProjectId(projectId);

    if (!currentStory) {
      // Create first version
      return this.create({
        projectId,
        hook: data.hook,
        middleStructure: data.middleStructure,
        ending: data.ending,
        version: 1,
      });
    }

    // Update existing story and increment version
    const updateData: any = {
      version: currentStory.version + 1,
    };
    
    if (data.hook !== undefined) updateData.hook = data.hook;
    if (data.middleStructure !== undefined) updateData.middleStructure = data.middleStructure;
    if (data.ending !== undefined) updateData.ending = data.ending;

    const updatedStory = await this.update(currentStory.id, updateData);

    return updatedStory!;
  }
}
