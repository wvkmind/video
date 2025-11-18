import { AppDataSource } from '../config/database';
import { Shot } from '../entities/Shot';
import { BaseRepository } from './BaseRepository';
import { In } from 'typeorm';

/**
 * Repository for Shot entity with CRUD operations
 */
export class ShotRepository extends BaseRepository<Shot> {
  constructor() {
    super(AppDataSource.getRepository(Shot));
  }

  /**
   * Find all shots for a project
   */
  async findByProjectId(projectId: string): Promise<Shot[]> {
    return this.repository.find({
      where: { projectId },
      order: { sequenceNumber: 'ASC' },
      relations: ['scene', 'keyframes', 'clips'],
    });
  }

  /**
   * Find all shots for a scene
   */
  async findBySceneId(sceneId: string): Promise<Shot[]> {
    return this.repository.find({
      where: { sceneId },
      order: { sequenceNumber: 'ASC' },
    });
  }

  /**
   * Find shot with all relations
   */
  async findByIdWithRelations(id: string): Promise<Shot | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['scene', 'project', 'keyframes', 'clips'],
    });
  }

  /**
   * Find shot by shot ID (e.g., "S1-01")
   */
  async findByShotId(projectId: string, shotId: string): Promise<Shot | null> {
    return this.repository.findOne({
      where: { projectId, shotId },
    });
  }

  /**
   * Get next sequence number for a project
   */
  async getNextSequenceNumber(projectId: string): Promise<number> {
    const lastShot = await this.repository.findOne({
      where: { projectId },
      order: { sequenceNumber: 'DESC' },
    });
    return (lastShot?.sequenceNumber ?? 0) + 1;
  }

  /**
   * Get next sequence number for a scene
   */
  async getNextSequenceNumberForScene(sceneId: string): Promise<number> {
    const lastShot = await this.repository.findOne({
      where: { sceneId },
      order: { sequenceNumber: 'DESC' },
    });
    return (lastShot?.sequenceNumber ?? 0) + 1;
  }

  /**
   * Reorder shots - update sequence numbers
   */
  async reorderShots(shotIds: string[]): Promise<void> {
    // Update each shot's sequence number based on its position in the array
    for (let i = 0; i < shotIds.length; i++) {
      await this.repository.update(shotIds[i], { sequenceNumber: i + 1 });
    }
  }

  /**
   * Batch update shots
   */
  async batchUpdate(shotIds: string[], data: Partial<Shot>): Promise<void> {
    await this.repository.update({ id: In(shotIds) }, data as any);
  }

  /**
   * Find shots by type
   */
  async findByType(projectId: string, shotType: Shot['shotType']): Promise<Shot[]> {
    return this.repository.find({
      where: { projectId, shotType },
      order: { sequenceNumber: 'ASC' },
    });
  }

  /**
   * Find shots with transition relationships
   */
  async findWithTransitions(projectId: string): Promise<Shot[]> {
    return this.repository
      .createQueryBuilder('shot')
      .where('shot.projectId = :projectId', { projectId })
      .andWhere('shot.previousShotId IS NOT NULL OR shot.nextShotId IS NOT NULL')
      .orderBy('shot.sequenceNumber', 'ASC')
      .getMany();
  }

  /**
   * Find shots that use last frame as first
   */
  async findWithFrameTransitions(projectId: string): Promise<Shot[]> {
    return this.repository.find({
      where: { projectId, useLastFrameAsFirst: true },
      order: { sequenceNumber: 'ASC' },
    });
  }

  /**
   * Count shots in a project
   */
  async countByProjectId(projectId: string): Promise<number> {
    return this.repository.count({ where: { projectId } });
  }

  /**
   * Count shots in a scene
   */
  async countBySceneId(sceneId: string): Promise<number> {
    return this.repository.count({ where: { sceneId } });
  }

  /**
   * Find shots with pagination for a project
   */
  async findByProjectIdWithPagination(
    projectId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: Shot[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: { projectId },
      order: { sequenceNumber: 'ASC' },
      skip,
      take: limit,
      relations: ['scene'],
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
   * Export shots as structured data (for storyboard export)
   */
  async exportStoryboard(projectId: string): Promise<Shot[]> {
    return this.repository.find({
      where: { projectId },
      order: { sequenceNumber: 'ASC' },
      relations: ['scene'],
    });
  }

  /**
   * Find previous shot in sequence
   */
  async findPreviousShot(projectId: string, sequenceNumber: number): Promise<Shot | null> {
    return this.repository.findOne({
      where: { projectId },
      order: { sequenceNumber: 'DESC' },
    });
  }

  /**
   * Find next shot in sequence
   */
  async findNextShot(projectId: string, sequenceNumber: number): Promise<Shot | null> {
    return this.repository
      .createQueryBuilder('shot')
      .where('shot.projectId = :projectId', { projectId })
      .andWhere('shot.sequenceNumber > :sequenceNumber', { sequenceNumber })
      .orderBy('shot.sequenceNumber', 'ASC')
      .getOne();
  }

  /**
   * Set transition relationship between shots
   */
  async setTransitionRelationship(
    shotId: string,
    previousShotId: string | null,
    nextShotId: string | null,
    transitionType: Shot['transitionType'],
    useLastFrameAsFirst: boolean
  ): Promise<Shot | null> {
    const updateData: any = {
      previousShotId: previousShotId ?? undefined,
      nextShotId: nextShotId ?? undefined,
      transitionType,
      useLastFrameAsFirst,
    };
    return this.update(shotId, updateData);
  }
}
