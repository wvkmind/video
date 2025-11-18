import { AppDataSource } from '../config/database';
import { Story } from '../entities/Story';
import { Scene } from '../entities/Scene';
import { Shot } from '../entities/Shot';
import { Keyframe } from '../entities/Keyframe';
import { Clip } from '../entities/Clip';

export interface DependentEntity {
  entityType: 'story' | 'scene' | 'shot' | 'keyframe' | 'clip';
  entityId: string;
  entityName: string;
  status: string;
}

export interface ImpactAnalysis {
  directDependents: DependentEntity[];
  indirectDependents: DependentEntity[];
  totalAffected: number;
}

export class DependencyService {
  /**
   * Get all entities that depend on the given entity
   * @param entityType - Type of the entity being modified
   * @param entityId - ID of the entity being modified
   * @returns List of dependent entities
   */
  async getDependentEntities(
    entityType: 'story' | 'scene' | 'shot' | 'keyframe',
    entityId: string
  ): Promise<DependentEntity[]> {
    const dependents: DependentEntity[] = [];

    switch (entityType) {
      case 'story':
        // Story -> Scenes -> Shots -> Keyframes -> Clips
        const scenes = await AppDataSource.getRepository(Scene).find({
          where: { projectId: entityId }
        });
        
        for (const scene of scenes) {
          dependents.push({
            entityType: 'scene',
            entityId: scene.id,
            entityName: scene.title || `Scene ${scene.sceneNumber}`,
            status: scene.status || 'draft'
          });
        }
        break;

      case 'scene':
        // Scene -> Shots -> Keyframes -> Clips
        const shots = await AppDataSource.getRepository(Shot).find({
          where: { sceneId: entityId }
        });
        
        for (const shot of shots) {
          dependents.push({
            entityType: 'shot',
            entityId: shot.id,
            entityName: shot.shotId || `Shot ${shot.sequenceNumber}`,
            status: shot.status || 'draft'
          });
        }
        break;

      case 'shot':
        // Shot -> Keyframes -> Clips
        const keyframes = await AppDataSource.getRepository(Keyframe).find({
          where: { shotId: entityId }
        });
        
        for (const keyframe of keyframes) {
          dependents.push({
            entityType: 'keyframe',
            entityId: keyframe.id,
            entityName: `Keyframe v${keyframe.version}`,
            status: keyframe.isSelected ? 'selected' : 'generated'
          });
        }
        break;

      case 'keyframe':
        // Keyframe -> Clips (if using image-to-video mode)
        const clips = await AppDataSource.getRepository(Clip).find({
          where: { keyframeId: entityId }
        });
        
        for (const clip of clips) {
          dependents.push({
            entityType: 'clip',
            entityId: clip.id,
            entityName: `Clip v${clip.version}`,
            status: clip.status || 'pending'
          });
        }
        break;
    }

    return dependents;
  }

  /**
   * Check the downstream impact of modifying an entity
   * @param entityType - Type of the entity being modified
   * @param entityId - ID of the entity being modified
   * @returns Impact analysis with direct and indirect dependents
   */
  async checkDownstreamImpact(
    entityType: 'story' | 'scene' | 'shot' | 'keyframe',
    entityId: string
  ): Promise<ImpactAnalysis> {
    const directDependents = await this.getDependentEntities(entityType, entityId);
    const indirectDependents: DependentEntity[] = [];

    // Recursively get indirect dependents
    for (const dependent of directDependents) {
      if (dependent.entityType !== 'clip') {
        const subDependents = await this.getDependentEntities(
          dependent.entityType as 'story' | 'scene' | 'shot' | 'keyframe',
          dependent.entityId
        );
        indirectDependents.push(...subDependents);
      }
    }

    return {
      directDependents,
      indirectDependents,
      totalAffected: directDependents.length + indirectDependents.length
    };
  }
}
