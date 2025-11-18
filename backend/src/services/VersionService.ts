import { VersionRepository } from '../repositories/VersionRepository';
import { Version } from '../entities/Version';
import { AppDataSource } from '../config/database';
import { Story } from '../entities/Story';
import { Scene } from '../entities/Scene';
import { Shot } from '../entities/Shot';
import { Keyframe } from '../entities/Keyframe';
import { Clip } from '../entities/Clip';
import { Timeline } from '../entities/Timeline';

/**
 * Service for managing entity versions
 * Provides version control for Story, Scene, Shot, Keyframe, Clip, and Timeline entities
 * Validates: Requirements 8.1, 8.2, 8.3
 */
export class VersionService {
  private versionRepository: VersionRepository;

  constructor() {
    this.versionRepository = new VersionRepository();
  }

  /**
   * Create a new version snapshot for an entity
   * Validates: Requirements 8.1
   * 
   * @param entityType - Type of entity being versioned
   * @param entityId - ID of the entity
   * @param snapshot - Complete snapshot of entity data
   * @param options - Optional version name and change summary
   * @returns Created version record
   */
  async createVersion(
    entityType: Version['entityType'],
    entityId: string,
    snapshot: Record<string, any>,
    options?: {
      versionName?: string;
      changeSummary?: string;
      createdBy?: string;
    }
  ): Promise<Version> {
    // Validate entity type
    const validTypes: Version['entityType'][] = [
      'story',
      'scene',
      'shot',
      'keyframe',
      'clip',
      'timeline',
    ];
    if (!validTypes.includes(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    // Validate entity exists
    await this.validateEntityExists(entityType, entityId);

    // Get next version number
    const latestVersionNumber = await this.versionRepository.getLatestVersionNumber(
      entityType,
      entityId
    );
    const newVersionNumber = latestVersionNumber + 1;

    // Create version record
    const version = await this.versionRepository.create({
      entityType,
      entityId,
      versionNumber: newVersionNumber,
      versionName: options?.versionName,
      snapshot,
      changeSummary: options?.changeSummary,
      createdBy: options?.createdBy,
    });

    return version;
  }

  /**
   * List all versions for an entity
   * Validates: Requirements 8.2
   * 
   * @param entityType - Type of entity
   * @param entityId - ID of the entity
   * @returns Array of versions ordered by version number (newest first)
   */
  async listVersions(
    entityType: Version['entityType'],
    entityId: string
  ): Promise<Version[]> {
    // Validate entity exists
    await this.validateEntityExists(entityType, entityId);

    return this.versionRepository.findByEntity(entityType, entityId);
  }

  /**
   * Restore an entity to a specific version
   * Validates: Requirements 8.3
   * 
   * @param versionId - ID of the version to restore
   * @returns The restored entity
   */
  async restoreVersion(versionId: string): Promise<any> {
    // Get version record
    const version = await this.versionRepository.findById(versionId);
    if (!version) {
      throw new Error(`Version with id ${versionId} not found`);
    }

    // Restore entity based on type
    return AppDataSource.transaction(async (transactionalEntityManager) => {
      let restoredEntity: any;

      switch (version.entityType) {
        case 'story':
          restoredEntity = await transactionalEntityManager.update(
            Story,
            version.entityId,
            version.snapshot
          );
          // Fetch the updated entity
          restoredEntity = await transactionalEntityManager.findOne(Story, {
            where: { id: version.entityId },
          });
          break;

        case 'scene':
          restoredEntity = await transactionalEntityManager.update(
            Scene,
            version.entityId,
            version.snapshot
          );
          restoredEntity = await transactionalEntityManager.findOne(Scene, {
            where: { id: version.entityId },
          });
          break;

        case 'shot':
          restoredEntity = await transactionalEntityManager.update(
            Shot,
            version.entityId,
            version.snapshot
          );
          restoredEntity = await transactionalEntityManager.findOne(Shot, {
            where: { id: version.entityId },
          });
          break;

        case 'keyframe':
          restoredEntity = await transactionalEntityManager.update(
            Keyframe,
            version.entityId,
            version.snapshot
          );
          restoredEntity = await transactionalEntityManager.findOne(Keyframe, {
            where: { id: version.entityId },
          });
          break;

        case 'clip':
          restoredEntity = await transactionalEntityManager.update(
            Clip,
            version.entityId,
            version.snapshot
          );
          restoredEntity = await transactionalEntityManager.findOne(Clip, {
            where: { id: version.entityId },
          });
          break;

        case 'timeline':
          restoredEntity = await transactionalEntityManager.update(
            Timeline,
            version.entityId,
            version.snapshot
          );
          restoredEntity = await transactionalEntityManager.findOne(Timeline, {
            where: { id: version.entityId },
          });
          break;

        default:
          throw new Error(`Unsupported entity type: ${version.entityType}`);
      }

      if (!restoredEntity) {
        throw new Error(
          `Failed to restore ${version.entityType} with id ${version.entityId}`
        );
      }

      // Create a new version record for the restoration
      await this.createVersion(
        version.entityType,
        version.entityId,
        version.snapshot,
        {
          versionName: `Restored from v${version.versionNumber}`,
          changeSummary: `Restored to version ${version.versionNumber}`,
        }
      );

      return restoredEntity;
    });
  }

  /**
   * Compare two versions of an entity
   * 
   * @param versionId1 - ID of first version
   * @param versionId2 - ID of second version
   * @returns Comparison object showing differences
   */
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: Version;
    version2: Version;
    differences: Array<{
      field: string;
      value1: any;
      value2: any;
      changed: boolean;
    }>;
  }> {
    // Get both versions
    const version1 = await this.versionRepository.findById(versionId1);
    const version2 = await this.versionRepository.findById(versionId2);

    if (!version1) {
      throw new Error(`Version with id ${versionId1} not found`);
    }
    if (!version2) {
      throw new Error(`Version with id ${versionId2} not found`);
    }

    // Ensure versions are for the same entity
    if (
      version1.entityType !== version2.entityType ||
      version1.entityId !== version2.entityId
    ) {
      throw new Error('Cannot compare versions of different entities');
    }

    // Compare snapshots
    const differences = this.compareSnapshots(version1.snapshot, version2.snapshot);

    return {
      version1,
      version2,
      differences,
    };
  }

  /**
   * Get a specific version by entity and version number
   */
  async getVersion(
    entityType: Version['entityType'],
    entityId: string,
    versionNumber: number
  ): Promise<Version | null> {
    return this.versionRepository.findByEntityAndVersion(
      entityType,
      entityId,
      versionNumber
    );
  }

  /**
   * Get the current version number for an entity
   */
  async getCurrentVersionNumber(
    entityType: Version['entityType'],
    entityId: string
  ): Promise<number> {
    return this.versionRepository.getLatestVersionNumber(entityType, entityId);
  }

  /**
   * Delete all versions for an entity (used when entity is deleted)
   */
  async deleteEntityVersions(
    entityType: Version['entityType'],
    entityId: string
  ): Promise<void> {
    await this.versionRepository.deleteByEntity(entityType, entityId);
  }

  /**
   * Helper: Validate that an entity exists
   */
  private async validateEntityExists(
    entityType: Version['entityType'],
    entityId: string
  ): Promise<void> {
    const entityManager = AppDataSource.manager;
    let exists = false;

    switch (entityType) {
      case 'story':
        exists = !!(await entityManager.findOne(Story, { where: { id: entityId } }));
        break;
      case 'scene':
        exists = !!(await entityManager.findOne(Scene, { where: { id: entityId } }));
        break;
      case 'shot':
        exists = !!(await entityManager.findOne(Shot, { where: { id: entityId } }));
        break;
      case 'keyframe':
        exists = !!(await entityManager.findOne(Keyframe, { where: { id: entityId } }));
        break;
      case 'clip':
        exists = !!(await entityManager.findOne(Clip, { where: { id: entityId } }));
        break;
      case 'timeline':
        exists = !!(await entityManager.findOne(Timeline, { where: { id: entityId } }));
        break;
    }

    if (!exists) {
      throw new Error(`${entityType} with id ${entityId} not found`);
    }
  }

  /**
   * Helper: Compare two snapshots and return differences
   */
  private compareSnapshots(
    snapshot1: Record<string, any>,
    snapshot2: Record<string, any>
  ): Array<{
    field: string;
    value1: any;
    value2: any;
    changed: boolean;
  }> {
    const differences: Array<{
      field: string;
      value1: any;
      value2: any;
      changed: boolean;
    }> = [];

    // Get all unique keys from both snapshots
    const allKeys = new Set([
      ...Object.keys(snapshot1),
      ...Object.keys(snapshot2),
    ]);

    for (const key of allKeys) {
      const value1 = snapshot1[key];
      const value2 = snapshot2[key];

      // Deep comparison for objects and arrays
      const changed = JSON.stringify(value1) !== JSON.stringify(value2);

      differences.push({
        field: key,
        value1,
        value2,
        changed,
      });
    }

    return differences;
  }
}
