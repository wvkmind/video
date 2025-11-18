import { ShotRepository } from '../repositories/ShotRepository';
import { SceneRepository } from '../repositories/SceneRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { Shot } from '../entities/Shot';

/**
 * Service for managing shots with business logic
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export class ShotService {
  private shotRepository: ShotRepository;
  private sceneRepository: SceneRepository;
  private projectRepository: ProjectRepository;

  constructor() {
    this.shotRepository = new ShotRepository();
    this.sceneRepository = new SceneRepository();
    this.projectRepository = new ProjectRepository();
  }

  /**
   * Create a new shot
   * Validates: Requirements 3.2
   */
  async createShot(
    projectId: string,
    data: {
      sceneId: string;
      shotId: string;
      duration: number;
      shotType: Shot['shotType'];
      description?: string;
      environment?: string;
      subject?: string;
      action?: string;
      cameraMovement?: string;
      lighting?: string;
      style?: string;
      previousShotId?: string;
      nextShotId?: string;
      transitionType?: Shot['transitionType'];
      useLastFrameAsFirst?: boolean;
      relatedVoiceover?: string;
      importance?: Shot['importance'];
    }
  ): Promise<Shot> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    // Verify scene exists and belongs to project
    const scene = await this.sceneRepository.findById(data.sceneId);
    if (!scene) {
      throw new Error(`Scene with id ${data.sceneId} not found`);
    }
    if (scene.projectId !== projectId) {
      throw new Error(`Scene ${data.sceneId} does not belong to project ${projectId}`);
    }

    // Validate required fields
    if (!data.shotId || data.shotId.trim().length === 0) {
      throw new Error('Shot ID is required');
    }

    if (!data.duration || data.duration <= 0) {
      throw new Error('Duration must be a positive number');
    }

    if (!data.shotType) {
      throw new Error('Shot type is required');
    }

    // Check if shot ID already exists in project
    const existingShot = await this.shotRepository.findByShotId(projectId, data.shotId);
    if (existingShot) {
      throw new Error(`Shot with ID ${data.shotId} already exists in this project`);
    }

    // Get next sequence number
    const sequenceNumber = await this.shotRepository.getNextSequenceNumber(projectId);

    // Create shot
    const shot = await this.shotRepository.create({
      projectId,
      sceneId: data.sceneId,
      shotId: data.shotId.trim(),
      sequenceNumber,
      duration: data.duration,
      shotType: data.shotType,
      description: data.description?.trim(),
      environment: data.environment?.trim(),
      subject: data.subject?.trim(),
      action: data.action?.trim(),
      cameraMovement: data.cameraMovement?.trim(),
      lighting: data.lighting?.trim(),
      style: data.style?.trim(),
      previousShotId: data.previousShotId,
      nextShotId: data.nextShotId,
      transitionType: data.transitionType || 'cut',
      useLastFrameAsFirst: data.useLastFrameAsFirst || false,
      relatedVoiceover: data.relatedVoiceover?.trim(),
      importance: data.importance || 'medium',
    });

    // Update previous shot's nextShotId if specified
    if (data.previousShotId) {
      await this.shotRepository.update(data.previousShotId, {
        nextShotId: shot.id,
      });
    }

    // Update next shot's previousShotId if specified
    if (data.nextShotId) {
      await this.shotRepository.update(data.nextShotId, {
        previousShotId: shot.id,
      });
    }

    return shot;
  }

  /**
   * Get a shot by ID
   */
  async getShot(id: string): Promise<Shot> {
    const shot = await this.shotRepository.findById(id);
    if (!shot) {
      throw new Error(`Shot with id ${id} not found`);
    }
    return shot;
  }

  /**
   * Get shot with all relations
   */
  async getShotWithRelations(id: string): Promise<Shot> {
    const shot = await this.shotRepository.findByIdWithRelations(id);
    if (!shot) {
      throw new Error(`Shot with id ${id} not found`);
    }
    return shot;
  }

  /**
   * List all shots for a project (ordered by scene and sequence)
   * Validates: Requirements 3.1
   */
  async listShots(projectId: string): Promise<Shot[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    return this.shotRepository.findByProjectId(projectId);
  }

  /**
   * List shots for a scene
   */
  async listShotsByScene(sceneId: string): Promise<Shot[]> {
    // Verify scene exists
    const scene = await this.sceneRepository.findById(sceneId);
    if (!scene) {
      throw new Error(`Scene with id ${sceneId} not found`);
    }

    return this.shotRepository.findBySceneId(sceneId);
  }

  /**
   * Update a shot
   * Validates: Requirements 3.2
   */
  async updateShot(
    id: string,
    data: Partial<{
      shotId: string;
      sceneId: string;
      duration: number;
      shotType: Shot['shotType'];
      description: string;
      environment: string;
      subject: string;
      action: string;
      cameraMovement: string;
      lighting: string;
      style: string;
      previousShotId: string;
      nextShotId: string;
      transitionType: Shot['transitionType'];
      useLastFrameAsFirst: boolean;
      relatedVoiceover: string;
      importance: Shot['importance'];
    }>
  ): Promise<Shot> {
    // Get existing shot
    const shot = await this.getShot(id);

    // Validate fields if provided
    if (data.shotId !== undefined && data.shotId.trim().length === 0) {
      throw new Error('Shot ID cannot be empty');
    }

    if (data.duration !== undefined && data.duration <= 0) {
      throw new Error('Duration must be a positive number');
    }

    // If changing scene, verify new scene exists and belongs to same project
    if (data.sceneId !== undefined && data.sceneId !== shot.sceneId) {
      const newScene = await this.sceneRepository.findById(data.sceneId);
      if (!newScene) {
        throw new Error(`Scene with id ${data.sceneId} not found`);
      }
      if (newScene.projectId !== shot.projectId) {
        throw new Error(`Scene ${data.sceneId} does not belong to the same project`);
      }
    }

    // If changing shotId, check for duplicates
    if (data.shotId !== undefined && data.shotId !== shot.shotId) {
      const existingShot = await this.shotRepository.findByShotId(shot.projectId, data.shotId);
      if (existingShot && existingShot.id !== id) {
        throw new Error(`Shot with ID ${data.shotId} already exists in this project`);
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.shotId !== undefined) updateData.shotId = data.shotId.trim();
    if (data.sceneId !== undefined) updateData.sceneId = data.sceneId;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.shotType !== undefined) updateData.shotType = data.shotType;
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.environment !== undefined) updateData.environment = data.environment.trim();
    if (data.subject !== undefined) updateData.subject = data.subject.trim();
    if (data.action !== undefined) updateData.action = data.action.trim();
    if (data.cameraMovement !== undefined) updateData.cameraMovement = data.cameraMovement.trim();
    if (data.lighting !== undefined) updateData.lighting = data.lighting.trim();
    if (data.style !== undefined) updateData.style = data.style.trim();
    if (data.previousShotId !== undefined) updateData.previousShotId = data.previousShotId;
    if (data.nextShotId !== undefined) updateData.nextShotId = data.nextShotId;
    if (data.transitionType !== undefined) updateData.transitionType = data.transitionType;
    if (data.useLastFrameAsFirst !== undefined)
      updateData.useLastFrameAsFirst = data.useLastFrameAsFirst;
    if (data.relatedVoiceover !== undefined)
      updateData.relatedVoiceover = data.relatedVoiceover.trim();
    if (data.importance !== undefined) updateData.importance = data.importance;

    // Update shot
    const updated = await this.shotRepository.update(id, updateData);
    if (!updated) {
      throw new Error(`Failed to update shot ${id}`);
    }

    return updated;
  }

  /**
   * Delete a shot
   */
  async deleteShot(id: string): Promise<void> {
    // Get shot to update relationships
    const shot = await this.getShot(id);

    // Update previous shot's nextShotId
    if (shot.previousShotId) {
      await this.shotRepository.update(shot.previousShotId, {
        nextShotId: shot.nextShotId,
      });
    }

    // Update next shot's previousShotId
    if (shot.nextShotId) {
      await this.shotRepository.update(shot.nextShotId, {
        previousShotId: shot.previousShotId,
      });
    }

    // Delete shot (cascade delete will handle keyframes and clips)
    await this.shotRepository.delete(id);
  }

  /**
   * Reorder shots (batch update sequence numbers)
   * Validates: Requirements 3.3
   */
  async reorderShots(shotIds: string[]): Promise<Shot[]> {
    if (!shotIds || shotIds.length === 0) {
      throw new Error('Shot IDs array cannot be empty');
    }

    // Verify all shots exist and belong to the same project
    const shots = await Promise.all(shotIds.map((id) => this.getShot(id)));

    const projectId = shots[0].projectId;
    const invalidShots = shots.filter((shot) => shot.projectId !== projectId);
    if (invalidShots.length > 0) {
      throw new Error('All shots must belong to the same project');
    }

    // Update sequence numbers
    await this.shotRepository.reorderShots(shotIds);

    // Return updated shots
    return this.listShots(projectId);
  }

  /**
   * Batch update style for multiple shots
   * Validates: Requirements 3.5
   */
  async batchUpdateStyle(
    shotIds: string[],
    styleData: {
      style?: string;
      lighting?: string;
      cameraMovement?: string;
    }
  ): Promise<Shot[]> {
    if (!shotIds || shotIds.length === 0) {
      throw new Error('Shot IDs array cannot be empty');
    }

    // Verify all shots exist
    await Promise.all(shotIds.map((id) => this.getShot(id)));

    // Prepare update data
    const updateData: any = {};
    if (styleData.style !== undefined) updateData.style = styleData.style.trim();
    if (styleData.lighting !== undefined) updateData.lighting = styleData.lighting.trim();
    if (styleData.cameraMovement !== undefined)
      updateData.cameraMovement = styleData.cameraMovement.trim();

    // Batch update
    await this.shotRepository.batchUpdate(shotIds, updateData);

    // Return updated shots
    const updatedShots = await Promise.all(shotIds.map((id) => this.getShot(id)));
    return updatedShots;
  }

  /**
   * Export storyboard as structured data
   * Validates: Requirements 3.6
   */
  async exportStoryboard(
    projectId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string | object[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    // Get all shots with scene information
    const shots = await this.shotRepository.exportStoryboard(projectId);

    if (format === 'json') {
      // Return as JSON array
      return shots.map((shot) => ({
        shotId: shot.shotId,
        sceneNumber: shot.scene?.sceneNumber,
        sceneTitle: shot.scene?.title,
        sequenceNumber: shot.sequenceNumber,
        duration: shot.duration,
        shotType: shot.shotType,
        description: shot.description,
        environment: shot.environment,
        subject: shot.subject,
        action: shot.action,
        cameraMovement: shot.cameraMovement,
        lighting: shot.lighting,
        style: shot.style,
        transitionType: shot.transitionType,
        useLastFrameAsFirst: shot.useLastFrameAsFirst,
        relatedVoiceover: shot.relatedVoiceover,
        importance: shot.importance,
      }));
    } else {
      // Return as CSV string
      const headers = [
        'Shot ID',
        'Scene Number',
        'Scene Title',
        'Sequence',
        'Duration',
        'Shot Type',
        'Description',
        'Environment',
        'Subject',
        'Action',
        'Camera Movement',
        'Lighting',
        'Style',
        'Transition Type',
        'Use Last Frame',
        'Related Voiceover',
        'Importance',
      ];

      const rows = shots.map((shot) => [
        shot.shotId,
        shot.scene?.sceneNumber || '',
        shot.scene?.title || '',
        shot.sequenceNumber,
        shot.duration,
        shot.shotType,
        shot.description || '',
        shot.environment || '',
        shot.subject || '',
        shot.action || '',
        shot.cameraMovement || '',
        shot.lighting || '',
        shot.style || '',
        shot.transitionType || '',
        shot.useLastFrameAsFirst ? 'Yes' : 'No',
        shot.relatedVoiceover || '',
        shot.importance || '',
      ]);

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      return csvContent;
    }
  }

  /**
   * Set transition relationship between shots
   * Validates: Requirements 3.4
   */
  async setTransitionRelationship(
    shotId: string,
    data: {
      previousShotId?: string | null;
      nextShotId?: string | null;
      transitionType: Shot['transitionType'];
      useLastFrameAsFirst: boolean;
    }
  ): Promise<Shot> {
    // Verify shot exists
    const shot = await this.getShot(shotId);

    // Verify previous shot exists if provided
    if (data.previousShotId) {
      const prevShot = await this.getShot(data.previousShotId);
      if (prevShot.projectId !== shot.projectId) {
        throw new Error('Previous shot must belong to the same project');
      }
    }

    // Verify next shot exists if provided
    if (data.nextShotId) {
      const nextShot = await this.getShot(data.nextShotId);
      if (nextShot.projectId !== shot.projectId) {
        throw new Error('Next shot must belong to the same project');
      }
    }

    // Update shot
    const updated = await this.shotRepository.update(shotId, {
      previousShotId: data.previousShotId ?? undefined,
      nextShotId: data.nextShotId ?? undefined,
      transitionType: data.transitionType,
      useLastFrameAsFirst: data.useLastFrameAsFirst,
    });

    if (!updated) {
      throw new Error(`Failed to update shot ${shotId}`);
    }

    return updated;
  }

  /**
   * Count shots in a project
   */
  async countShots(projectId: string): Promise<number> {
    return this.shotRepository.countByProjectId(projectId);
  }

  /**
   * Count shots in a scene
   */
  async countShotsByScene(sceneId: string): Promise<number> {
    return this.shotRepository.countBySceneId(sceneId);
  }

  /**
   * Validate transition chain integrity
   * Validates: Requirements 9.1
   * Checks that the transition chain is complete and consistent
   */
  async validateTransitionChain(projectId: string): Promise<{
    isValid: boolean;
    errors: Array<{ shotId: string; message: string }>;
  }> {
    const shots = await this.listShots(projectId);
    const errors: Array<{ shotId: string; message: string }> = [];

    // Build a map of shots by ID for quick lookup
    const shotMap = new Map<string, Shot>();
    shots.forEach((shot) => shotMap.set(shot.id, shot));

    for (const shot of shots) {
      // Check if previousShotId reference is valid
      if (shot.previousShotId) {
        const prevShot = shotMap.get(shot.previousShotId);
        if (!prevShot) {
          errors.push({
            shotId: shot.shotId,
            message: `Previous shot reference ${shot.previousShotId} not found`,
          });
        } else {
          // Check if the previous shot's nextShotId points back to this shot
          if (prevShot.nextShotId !== shot.id) {
            errors.push({
              shotId: shot.shotId,
              message: `Previous shot ${prevShot.shotId} does not reference this shot as next`,
            });
          }
        }
      }

      // Check if nextShotId reference is valid
      if (shot.nextShotId) {
        const nextShot = shotMap.get(shot.nextShotId);
        if (!nextShot) {
          errors.push({
            shotId: shot.shotId,
            message: `Next shot reference ${shot.nextShotId} not found`,
          });
        } else {
          // Check if the next shot's previousShotId points back to this shot
          if (nextShot.previousShotId !== shot.id) {
            errors.push({
              shotId: shot.shotId,
              message: `Next shot ${nextShot.shotId} does not reference this shot as previous`,
            });
          }
        }
      }

      // Check for circular references
      if (shot.previousShotId && shot.nextShotId) {
        const visited = new Set<string>();
        let current: Shot | undefined = shot;
        
        // Check forward chain
        while (current && current.nextShotId) {
          if (visited.has(current.id)) {
            errors.push({
              shotId: shot.shotId,
              message: `Circular reference detected in transition chain`,
            });
            break;
          }
          visited.add(current.id);
          current = shotMap.get(current.nextShotId);
        }
      }

      // Warn if useLastFrameAsFirst is true but no previous shot
      if (shot.useLastFrameAsFirst && !shot.previousShotId) {
        errors.push({
          shotId: shot.shotId,
          message: `useLastFrameAsFirst is enabled but no previous shot is set`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
