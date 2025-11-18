import { AppDataSource } from '../config/database';
import { Clip } from '../entities/Clip';
import { BaseRepository } from './BaseRepository';
import { cacheManager, CacheKeys } from '../utils/cacheManager';

/**
 * Repository for Clip entity with CRUD operations
 * Optimized with caching
 */
export class ClipRepository extends BaseRepository<Clip> {
  constructor() {
    super(AppDataSource.getRepository(Clip));
  }

  /**
   * Find clips by shot ID with caching
   */
  async findByShotId(shotId: string): Promise<Clip[]> {
    return cacheManager.getOrSet(
      CacheKeys.clipList(shotId),
      async () => {
        return this.repository.find({
          where: { shotId },
          order: { version: 'DESC' },
        });
      },
      2 * 60 * 1000 // 2 minutes
    );
  }

  /**
   * Find selected clip for a shot with caching
   */
  async findSelectedByShotId(shotId: string): Promise<Clip | null> {
    return cacheManager.getOrSet(
      CacheKeys.clipSelected(shotId),
      async () => {
        return this.repository.findOne({
          where: { shotId, isSelected: true },
        });
      },
      2 * 60 * 1000 // 2 minutes
    );
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
   * Select a clip (unselect others for the same shot) with cache invalidation
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
    const result = await this.update(id, { isSelected: true });
    
    // Invalidate cache
    cacheManager.delete(CacheKeys.clipList(clip.shotId));
    cacheManager.delete(CacheKeys.clipSelected(clip.shotId));
    
    return result;
  }
}
