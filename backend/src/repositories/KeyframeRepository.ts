import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Keyframe } from '../entities/Keyframe';
import { BaseRepository } from './BaseRepository';

export class KeyframeRepository extends BaseRepository<Keyframe> {
  constructor() {
    super(AppDataSource.getRepository(Keyframe));
  }

  /**
   * Find all keyframes for a specific shot
   */
  async findByShotId(shotId: string): Promise<Keyframe[]> {
    return this.repository.find({
      where: { shotId },
      order: { version: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Find the selected keyframe for a shot
   */
  async findSelectedByShotId(shotId: string): Promise<Keyframe | null> {
    return this.repository.findOne({
      where: { shotId, isSelected: true },
    });
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
   * Deselect all keyframes for a shot
   */
  async deselectAll(shotId: string): Promise<void> {
    await this.repository.update(
      { shotId },
      { isSelected: false }
    );
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
