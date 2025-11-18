import { BaseRepository } from './BaseRepository';
import { Version } from '../entities/Version';
import { AppDataSource } from '../config/database';

/**
 * Repository for Version entity
 */
export class VersionRepository extends BaseRepository<Version> {
  constructor() {
    super(AppDataSource.getRepository(Version));
  }

  /**
   * Find all versions for a specific entity
   */
  async findByEntity(
    entityType: Version['entityType'],
    entityId: string
  ): Promise<Version[]> {
    return this.repository.find({
      where: { entityType, entityId },
      order: { versionNumber: 'DESC' },
    });
  }

  /**
   * Find a specific version by entity and version number
   */
  async findByEntityAndVersion(
    entityType: Version['entityType'],
    entityId: string,
    versionNumber: number
  ): Promise<Version | null> {
    return this.repository.findOne({
      where: { entityType, entityId, versionNumber },
    });
  }

  /**
   * Get the latest version number for an entity
   */
  async getLatestVersionNumber(
    entityType: Version['entityType'],
    entityId: string
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('version')
      .select('MAX(version.versionNumber)', 'maxVersion')
      .where('version.entityType = :entityType', { entityType })
      .andWhere('version.entityId = :entityId', { entityId })
      .getRawOne();

    return result?.maxVersion || 0;
  }

  /**
   * Count versions for an entity
   */
  async countByEntity(
    entityType: Version['entityType'],
    entityId: string
  ): Promise<number> {
    return this.repository.count({
      where: { entityType, entityId },
    });
  }

  /**
   * Delete all versions for an entity
   */
  async deleteByEntity(
    entityType: Version['entityType'],
    entityId: string
  ): Promise<void> {
    await this.repository.delete({ entityType, entityId });
  }
}
