import { KeyframeRepository } from '../repositories/KeyframeRepository';
import { ShotRepository } from '../repositories/ShotRepository';
import { ComfyUIAdapter } from './ComfyUIAdapter';
import { Keyframe } from '../entities/Keyframe';
import path from 'path';
import fs from 'fs/promises';

export interface KeyframeGenerationParams {
  workflowName: string;
  prompt?: string; // Optional override
  negativePrompt?: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  width?: number;
  height?: number;
  seed?: number;
  referenceImage?: string; // For shot transition continuity
  referenceStrength?: number;
}

export interface GeneratedKeyframe {
  id: string;
  version: number;
  imagePath: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  comfyuiTaskId?: string;
}

export class KeyframeService {
  private keyframeRepository: KeyframeRepository;
  private shotRepository: ShotRepository;
  private comfyuiAdapter: ComfyUIAdapter;
  private storageBasePath: string;

  constructor() {
    this.keyframeRepository = new KeyframeRepository();
    this.shotRepository = new ShotRepository();
    this.comfyuiAdapter = new ComfyUIAdapter();
    this.storageBasePath = process.env.STORAGE_BASE_PATH || './storage';
  }

  /**
   * Generate prompt from shot fields
   * Requirement 4.2: Auto-generate English prompt from shot description fields
   */
  async generatePrompt(shotId: string): Promise<string> {
    const shot = await this.shotRepository.findById(shotId);
    if (!shot) {
      throw new Error(`Shot not found: ${shotId}`);
    }

    const parts: string[] = [];

    // Add environment
    if (shot.environment) {
      parts.push(shot.environment);
    }

    // Add subject
    if (shot.subject) {
      parts.push(shot.subject);
    }

    // Add action
    if (shot.action) {
      parts.push(shot.action);
    }

    // Add camera movement
    if (shot.cameraMovement) {
      parts.push(`camera ${shot.cameraMovement}`);
    }

    // Add lighting
    if (shot.lighting) {
      parts.push(shot.lighting);
    }

    // Add style
    if (shot.style) {
      parts.push(shot.style);
    }

    // Join all parts with commas
    const prompt = parts.filter(p => p.trim()).join(', ');

    return prompt || 'a cinematic scene';
  }

  /**
   * Generate keyframes for a shot
   * Requirement 4.4: Generate 4 candidate keyframe images via ComfyUI
   */
  async generateKeyframes(
    shotId: string,
    params: KeyframeGenerationParams
  ): Promise<GeneratedKeyframe[]> {
    const shot = await this.shotRepository.findById(shotId);
    if (!shot) {
      throw new Error(`Shot not found: ${shotId}`);
    }

    // Generate prompt if not provided
    let prompt = params.prompt;
    if (!prompt) {
      prompt = await this.generatePrompt(shotId);
    }

    // Get next version number
    const nextVersion = (await this.keyframeRepository.getLatestVersion(shotId)) + 1;

    // Check for shot transition continuity (Requirement 9.2)
    // Extract and use reference frame from previous shot
    let referenceImage = params.referenceImage;
    let referenceStrength = params.referenceStrength;
    
    if (!referenceImage && shot.useLastFrameAsFirst && shot.previousShotId) {
      // Get the selected keyframe from the previous shot
      const previousKeyframe = await this.keyframeRepository.findSelectedByShotId(
        shot.previousShotId
      );
      if (previousKeyframe && previousKeyframe.imagePath) {
        referenceImage = previousKeyframe.imagePath;
        referenceStrength = referenceStrength || 0.7; // High strength for continuity
        console.log(`Using reference keyframe from previous shot: ${previousKeyframe.imagePath}`);
      } else {
        console.warn(`Shot ${shot.shotId} has useLastFrameAsFirst enabled but no selected keyframe found in previous shot`);
      }
    }

    // Generate 4 candidate keyframes
    const generatedKeyframes: GeneratedKeyframe[] = [];
    const numCandidates = 4;

    for (let i = 0; i < numCandidates; i++) {
      // Create a unique seed for each candidate if not provided
      const seed = params.seed !== undefined ? params.seed + i : Math.floor(Math.random() * 1000000);

      // Create keyframe record with pending status
      const keyframe = new Keyframe();
      keyframe.shotId = shotId;
      keyframe.version = nextVersion;
      keyframe.prompt = prompt;
      keyframe.negativePrompt = params.negativePrompt || '';
      keyframe.workflowName = params.workflowName;
      keyframe.steps = params.steps || 30;
      keyframe.cfg = params.cfg || 7.5;
      keyframe.sampler = params.sampler || 'DPM++ 2M Karras';
      keyframe.width = params.width || 1024;
      keyframe.height = params.height || 1024;
      keyframe.seed = seed;
      keyframe.imagePath = ''; // Will be updated when generation completes
      keyframe.isSelected = false;
      keyframe.status = 'pending';

      const savedKeyframe = await this.keyframeRepository.create(keyframe);

      // Submit to ComfyUI
      try {
        const workflowParams: any = {
          workflowName: params.workflowName,
          prompt,
          negativePrompt: params.negativePrompt || '',
          steps: keyframe.steps,
          cfg: keyframe.cfg,
          sampler: keyframe.sampler,
          resolution: { width: keyframe.width, height: keyframe.height },
          seed,
        };

        // Add reference image if available
        if (referenceImage) {
          workflowParams.referenceImage = referenceImage;
          workflowParams.referenceStrength = referenceStrength;
        }

        const taskId = await this.comfyuiAdapter.submitPrompt(
          params.workflowName,
          workflowParams
        );

        // Update keyframe with task ID
        savedKeyframe.comfyuiTaskId = taskId;
        savedKeyframe.status = 'processing';
        await this.keyframeRepository.update(savedKeyframe.id, savedKeyframe);

        generatedKeyframes.push({
          id: savedKeyframe.id,
          version: savedKeyframe.version,
          imagePath: savedKeyframe.imagePath,
          prompt: savedKeyframe.prompt,
          status: savedKeyframe.status,
          comfyuiTaskId: taskId,
        });
      } catch (error) {
        // Mark as failed
        savedKeyframe.status = 'failed';
        await this.keyframeRepository.update(savedKeyframe.id, savedKeyframe);

        generatedKeyframes.push({
          id: savedKeyframe.id,
          version: savedKeyframe.version,
          imagePath: savedKeyframe.imagePath,
          prompt: savedKeyframe.prompt,
          status: 'failed',
        });
      }
    }

    return generatedKeyframes;
  }

  /**
   * List all keyframes for a shot
   * Requirement 4.1: Display keyframe preview grid
   */
  async listKeyframes(shotId: string): Promise<Keyframe[]> {
    return this.keyframeRepository.findByShotId(shotId);
  }

  /**
   * Select a keyframe as the current one for a shot
   * Requirement 4.5: Mark selected keyframe and deselect others
   */
  async selectKeyframe(keyframeId: string): Promise<Keyframe> {
    const keyframe = await this.keyframeRepository.findById(keyframeId);
    if (!keyframe) {
      throw new Error(`Keyframe not found: ${keyframeId}`);
    }

    // Deselect all other keyframes for this shot
    await this.keyframeRepository.deselectAll(keyframe.shotId);

    // Select this keyframe
    keyframe.isSelected = true;
    const updated = await this.keyframeRepository.update(keyframeId, keyframe);
    if (!updated) {
      throw new Error(`Failed to update keyframe: ${keyframeId}`);
    }
    return updated;
  }

  /**
   * Get keyframe versions for a shot
   * Requirement 4.6: Preserve version history with parameters and seeds
   */
  async getKeyframeVersions(shotId: string): Promise<Keyframe[]> {
    return this.keyframeRepository.findByShotId(shotId);
  }

  /**
   * Get a single keyframe by ID
   */
  async getKeyframe(keyframeId: string): Promise<Keyframe | null> {
    return this.keyframeRepository.findById(keyframeId);
  }

  /**
   * Get the selected keyframe for a shot
   */
  async getSelectedKeyframe(shotId: string): Promise<Keyframe | null> {
    return this.keyframeRepository.findSelectedByShotId(shotId);
  }

  /**
   * Extract reference frame from previous shot for transition continuity
   * Validates: Requirements 9.2
   */
  async extractReferenceFrame(shotId: string): Promise<{
    referenceImage: string | null;
    referenceStrength: number;
  }> {
    const shot = await this.shotRepository.findById(shotId);
    if (!shot) {
      throw new Error(`Shot not found: ${shotId}`);
    }

    // Check if shot has transition continuity enabled
    if (!shot.useLastFrameAsFirst || !shot.previousShotId) {
      return {
        referenceImage: null,
        referenceStrength: 0,
      };
    }

    // Get the selected keyframe from the previous shot
    const previousKeyframe = await this.keyframeRepository.findSelectedByShotId(
      shot.previousShotId
    );

    if (!previousKeyframe || !previousKeyframe.imagePath) {
      console.warn(
        `Shot ${shot.shotId} has useLastFrameAsFirst enabled but no selected keyframe found in previous shot`
      );
      return {
        referenceImage: null,
        referenceStrength: 0,
      };
    }

    return {
      referenceImage: previousKeyframe.imagePath,
      referenceStrength: 0.7, // High strength for visual continuity
    };
  }

  /**
   * Update keyframe status and image path when ComfyUI task completes
   * Requirement 4.8: Save image path, final prompt, and generation parameters
   */
  async updateKeyframeFromTask(taskId: string): Promise<Keyframe | null> {
    const keyframe = await this.keyframeRepository.findByComfyUITaskId(taskId);
    if (!keyframe) {
      return null;
    }

    try {
      // Get task status first
      const status = await this.comfyuiAdapter.getTaskStatus(taskId);

      if (status.status === 'completed') {
        // Get task result from ComfyUI
        const result = await this.comfyuiAdapter.getTaskResult(taskId);

        if (result.images && result.images.length > 0) {
          // Get the first output image
          const outputImage = result.images[0];

          // Create storage directory for this shot
          const shotDir = path.join(this.storageBasePath, 'keyframes', keyframe.shotId);
          await fs.mkdir(shotDir, { recursive: true });

          // Generate filename
          const filename = `keyframe_v${keyframe.version}_${keyframe.id}.png`;
          const imagePath = path.join(shotDir, filename);

          // Copy or move the file from ComfyUI output to our storage
          // Note: In a real implementation, you'd copy the file from ComfyUI's output directory
          // For now, we'll just store the path reference
          keyframe.imagePath = outputImage;
          keyframe.status = 'completed';
        } else {
          keyframe.status = 'failed';
        }
      } else if (status.status === 'failed') {
        keyframe.status = 'failed';
      }

      return this.keyframeRepository.update(keyframe.id, keyframe);
    } catch (error) {
      keyframe.status = 'failed';
      return this.keyframeRepository.update(keyframe.id, keyframe);
    }
  }

  /**
   * Get keyframe generation status
   * Requirement 4.4: Query generation status
   */
  async getKeyframeStatus(keyframeId: string): Promise<{
    status: string;
    progress?: number;
    error?: string;
  }> {
    const keyframe = await this.keyframeRepository.findById(keyframeId);
    if (!keyframe) {
      throw new Error(`Keyframe not found: ${keyframeId}`);
    }

    if (!keyframe.comfyuiTaskId) {
      return { status: keyframe.status };
    }

    try {
      const taskStatus = await this.comfyuiAdapter.getTaskStatus(keyframe.comfyuiTaskId);
      
      // Update keyframe status if it has changed
      if (taskStatus.status !== keyframe.status) {
        keyframe.status = taskStatus.status as any;
        await this.keyframeRepository.update(keyframeId, keyframe);

        // If completed, update the image path
        if (taskStatus.status === 'completed') {
          await this.updateKeyframeFromTask(keyframe.comfyuiTaskId);
        }
      }

      return {
        status: taskStatus.status,
        progress: taskStatus.progress,
        error: taskStatus.error,
      };
    } catch (error) {
      return {
        status: keyframe.status,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
