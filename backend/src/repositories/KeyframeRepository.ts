import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Keyframe } from '../entities/Keyframe';
import { BaseRepository } from './BaseRepository';
import { cacheManager, CacheKeys } from '../utils/cacheManager';

export class KeyframeRepository extends BaseRepository<Keyframe> {
  constructor() {
    super(AppDataSource.getRepository(Keyframe));
  }

  /**
   * Find all keyframes for a specific shot with caching
   */
  async findByShotId(shotId: string): Promise<Keyframe[]> {
    return cacheManager.getOrSet(
      CacheKeys.keyframeList(shotId),
      async () => {
        return this.repository.find({
          where: { shotId },
          order: { version: 'DESC', createdAt: 'DESC' },
        });
      },
      2 * 60 * 1000 // 2 minutes
    );
  }

  /**
   * Find the selected keyframe for a shot with caching
   */
  async findSelectedByShotId(shotId: string): Promise<Keyframe | null> {
    return cacheManager.getOrSet(
      CacheKeys.keyframeSelected(shotId),
      async () => {
        return this.repository.findOne({
          where: { shotId, isSelected: true },
        });
      },
      2 * 60 * 1000 // 2 minutes
    );
  }

  /**
   * Get the latest version number for a shot
   */
  async getLatestVersion(shotId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('keyframe')
      .select('MAX(keyframe.version)', 'maxVersion')
      .where('keyframe.shotId = :shotId', { shotId })
      .getRawOne();

    return result?.maxVersion || 0;
  }

  /**
   * Deselect all keyframes for a shot with cache invalidation
   */
  async deselectAll(shotId: string): Promise<void> {
    await this.repository.update(
      { shotId },
      { isSelected: false }
    );
    
    // Invalidate cache
    cacheManager.delete(CacheKeys.keyframeList(shotId));
    cacheManager.delete(CacheKeys.keyframeSelected(shotId));
  }

  /**
   * Find keyframe by ComfyUI task ID
   */
  async findByComfyUITaskId(taskId: string): Promise<Keyframe | null> {
    return this.repository.findOne({
      where: { comfyuiTaskId: taskId },
    });
  }
}
