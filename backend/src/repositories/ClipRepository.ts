import { AppDataSource } from '../config/database';
import { Clip } from '../entities/Clip';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for Clip entity with CRUD operations
 */
export class ClipRepository extends BaseRepository<Clip> {
  constructor() {
    super(AppDataSource.getRepository(Clip));
  }

  /**
   * Find clips by shot ID
   */
  async findByShotId(shotId: string): Promise<Clip[]> {
    return this.repository.find({
      where: { shotId },
      order: { version: 'DESC' },
    });
  }

  /**
   * Find selected clip for a shot
   */
  async findSelectedByShotId(shotId: string): Promise<Clip | null> {
    return this.repository.findOne({
      where: { shotId, isSelected: true },
    });
  }

  /**
   * Get latest version number for a shot
   */
  async getLatestVersion(shotId: string): Promise<number> {
    const clip = await this.repository.findOne({
      where: { shotId },
      order: { version: 'DESC' },
    });
    return clip?.version ?? 0;
  }

  /**
   * Find clip by ComfyUI task ID
   */
  async findByTaskId(taskId: string): Promise<Clip | null> {
    return this.repository.findOne({
      where: { comfyuiTaskId: taskId },
    });
  }

  /**
   * Update clip status
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    videoPath?: string
  ): Promise<Clip | null> {
    const updateData: any = { status };
    
    if (status === 'completed' && videoPath) {
      updateData.videoPath = videoPath;
      updateData.completedAt = new Date();
    }

    return this.update(id, updateData);
  }

  /**
   * Select a clip (unselect others for the same shot)
   */
  async selectClip(id: string): Promise<Clip | null> {
    const clip = await this.findById(id);
    if (!clip) {
      return null;
    }

    // Unselect all clips for this shot
    await this.repository.update(
      { shotId: clip.shotId },
      { isSelected: false }
    );

    // Select this clip
    return this.update(id, { isSelected: true });
  }
}
