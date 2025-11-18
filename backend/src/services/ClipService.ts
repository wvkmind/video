import { ClipRepository } from '../repositories/ClipRepository';
import { ShotRepository } from '../repositories/ShotRepository';
import { KeyframeRepository } from '../repositories/KeyframeRepository';
import { ComfyUIAdapter } from './ComfyUIAdapter';
import { WorkflowConfigService } from './WorkflowConfigService';
import { FFmpegService } from './FFmpegService';
import { Clip } from '../entities/Clip';
import * as path from 'path';
import * as fs from 'fs/promises';

interface GenerateClipParams {
  shotId: string;
  inputMode: 'image_to_video' | 'text_to_video';
  keyframeId?: string;
  prompt?: string;
  workflowName: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  cfg?: number;
  seed?: number;
  useLastFrameReference?: boolean;
  referenceClipId?: string;
  referenceFrameNumber?: number;
  mode?: 'demo' | 'production';
}

/**
 * Service for managing video clips
 */
export class ClipService {
  private clipRepo: ClipRepository;
  private shotRepo: ShotRepository;
  private keyframeRepo: KeyframeRepository;
  private comfyUIAdapter: ComfyUIAdapter;
  private workflowService: WorkflowConfigService;
  private ffmpegService: FFmpegService;
  private storageBasePath: string;

  constructor() {
    this.clipRepo = new ClipRepository();
    this.shotRepo = new ShotRepository();
    this.keyframeRepo = new KeyframeRepository();
    this.comfyUIAdapter = new ComfyUIAdapter();
    this.workflowService = new WorkflowConfigService();
    this.ffmpegService = new FFmpegService();
    this.storageBasePath = process.env.STORAGE_BASE_PATH || './storage';
  }

  /**
   * Generate a video clip
   */
  async generateClip(params: GenerateClipParams): Promise<Clip> {
    const {
      shotId,
      inputMode,
      keyframeId,
      prompt,
      workflowName,
      mode = 'demo',
    } = params;

    // Validate shot exists
    const shot = await this.shotRepo.findById(shotId);
    if (!shot) {
      throw new Error(`Shot not found: ${shotId}`);
    }

    // Validate keyframe if image_to_video mode
    let keyframe;
    if (inputMode === 'image_to_video') {
      if (!keyframeId) {
        throw new Error('keyframeId is required for image_to_video mode');
      }
      keyframe = await this.keyframeRepo.findById(keyframeId);
      if (!keyframe) {
        throw new Error(`Keyframe not found: ${keyframeId}`);
      }
    }

    // Get workflow config
    const workflow = await this.workflowService.getWorkflow(workflowName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    // Get default parameters based on mode
    const defaultParams = this.getDefaultParams(mode, workflow);

    // Generate prompt if not provided
    const finalPrompt = prompt || (await this.generatePrompt(shot));

    // Get next version number
    const version = (await this.clipRepo.getLatestVersion(shotId)) + 1;

    // Extract last frame from previous clip if needed (Requirement 9.3)
    let firstFrameReference: string | undefined;
    let referenceFrameNumber: number | undefined;
    
    if (shot.useLastFrameAsFirst && shot.previousShotId) {
      try {
        const referenceData = await this.extractLastFrameFromPreviousShot(shot.previousShotId);
        if (referenceData) {
          firstFrameReference = referenceData.framePath;
          referenceFrameNumber = referenceData.frameNumber;
          console.log(`Using last frame from previous shot as first frame reference: ${firstFrameReference}`);
        }
      } catch (error) {
        console.warn(`Failed to extract last frame from previous shot: ${error}`);
      }
    }

    // Create clip record
    const clip = await this.clipRepo.create({
      shotId,
      version,
      inputMode,
      keyframeId,
      prompt: finalPrompt,
      workflowName,
      duration: params.duration ?? defaultParams.duration,
      fps: params.fps ?? defaultParams.fps,
      width: params.width ?? defaultParams.width,
      height: params.height ?? defaultParams.height,
      steps: params.steps ?? defaultParams.steps,
      guidance: params.guidance ?? defaultParams.guidance,
      cfg: params.cfg ?? defaultParams.cfg,
      seed: params.seed ?? defaultParams.seed ?? this.generateSeed(),
      useLastFrameReference: params.useLastFrameReference ?? shot.useLastFrameAsFirst ?? false,
      referenceClipId: params.referenceClipId,
      referenceFrameNumber: referenceFrameNumber,
      mode,
      status: 'pending',
    });

    // Submit to ComfyUI (async)
    this.submitToComfyUI(clip, keyframe?.imagePath, firstFrameReference).catch((error) => {
      console.error('Failed to submit clip to ComfyUI:', error);
      this.clipRepo.updateStatus(clip.id, 'failed');
    });

    return clip;
  }

  /**
   * Submit clip generation to ComfyUI
   */
  private async submitToComfyUI(
    clip: Clip,
    inputImagePath?: string,
    firstFrameReference?: string
  ): Promise<void> {
    try {
      // Build workflow parameters
      const params: any = {
        workflowName: clip.workflowName,
        prompt: clip.prompt,
        duration: clip.duration,
        fps: clip.fps,
        resolution: {
          width: clip.width,
          height: clip.height,
        },
        steps: clip.steps,
        cfg: clip.cfg,
        seed: clip.seed,
      };

      if (clip.inputMode === 'image_to_video' && inputImagePath) {
        params.keyframeImage = inputImagePath;
      }

      // Add first frame reference if available (for shot continuity)
      if (firstFrameReference) {
        params.firstFrameReference = firstFrameReference;
        params.firstFrameStrength = 1.0; // Full strength for exact frame matching
      }

      // Submit to ComfyUI
      const taskId = await this.comfyUIAdapter.submitPrompt(clip.workflowName, params);

      // Update clip with task ID
      await this.clipRepo.update(clip.id, {
        comfyuiTaskId: taskId,
        status: 'processing',
      });
    } catch (error) {
      console.error('Error submitting to ComfyUI:', error);
      throw error;
    }
  }

  /**
   * Get clip generation status
   */
  async getClipStatus(clipId: string): Promise<{
    status: string;
    progress?: number;
    videoPath?: string;
  }> {
    const clip = await this.clipRepo.findById(clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    if (clip.status === 'completed' || clip.status === 'failed') {
      return {
        status: clip.status,
        videoPath: clip.videoPath,
      };
    }

    if (!clip.comfyuiTaskId) {
      return { status: clip.status };
    }

    // Query ComfyUI for status
    try {
      const taskStatus = await this.comfyUIAdapter.getTaskStatus(clip.comfyuiTaskId);

      if (taskStatus.status === 'completed') {
        const result = await this.comfyUIAdapter.getTaskResult(clip.comfyuiTaskId);
        // Get the first video from the result
        const videoPath = result.videos?.[0] || '';
        await this.clipRepo.updateStatus(clip.id, 'completed', videoPath);
        return {
          status: 'completed',
          videoPath,
        };
      } else if (taskStatus.status === 'failed') {
        await this.clipRepo.updateStatus(clip.id, 'failed');
        return { status: 'failed' };
      }

      return {
        status: taskStatus.status,
        progress: taskStatus.progress,
      };
    } catch (error) {
      console.error('Error querying ComfyUI status:', error);
      return { status: clip.status };
    }
  }

  /**
   * List clips for a shot
   */
  async listClips(shotId: string): Promise<Clip[]> {
    return this.clipRepo.findByShotId(shotId);
  }

  /**
   * Select a clip as the active version
   */
  async selectClip(clipId: string): Promise<Clip | null> {
    return this.clipRepo.selectClip(clipId);
  }

  /**
   * Extract a specific frame from a clip
   */
  async extractFrame(clipId: string, frameNumber: number): Promise<string> {
    const clip = await this.clipRepo.findById(clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    if (!clip.videoPath) {
      throw new Error('Clip video not available');
    }

    // TODO: Implement frame extraction using FFmpeg
    // For now, return a placeholder
    return `/storage/frames/${clip.id}_frame_${frameNumber}.png`;
  }

  /**
   * Generate prompt from shot data
   */
  private async generatePrompt(shot: any): Promise<string> {
    const parts: string[] = [];

    if (shot.subject) parts.push(shot.subject);
    if (shot.action) parts.push(shot.action);
    if (shot.environment) parts.push(`in ${shot.environment}`);
    if (shot.lighting) parts.push(`${shot.lighting} lighting`);
    if (shot.cameraMovement) parts.push(`${shot.cameraMovement} camera movement`);
    if (shot.style) parts.push(`${shot.style} style`);

    return parts.join(', ') || 'A cinematic video clip';
  }

  /**
   * Get default parameters based on mode
   */
  private getDefaultParams(
    mode: 'demo' | 'production',
    workflow: any
  ): {
    duration: number;
    fps: number;
    width: number;
    height: number;
    steps: number;
    guidance: number;
    cfg: number;
    seed: number;
  } {
    const defaults = workflow.defaultParams || {};

    if (mode === 'demo') {
      return {
        duration: defaults.duration || 2,
        fps: defaults.fps || 8,
        width: defaults.width || 512,
        height: defaults.height || 512,
        steps: defaults.steps || 10,
        guidance: defaults.guidance || 2.0,
        cfg: defaults.cfg || 7.0,
        seed: this.generateSeed(),
      };
    } else {
      // Production mode - higher quality
      return {
        duration: defaults.duration || 5,
        fps: defaults.fps || 24,
        width: defaults.width || 1024,
        height: defaults.height || 1024,
        steps: defaults.steps || 25,
        guidance: defaults.guidance || 3.0,
        cfg: defaults.cfg || 7.5,
        seed: this.generateSeed(),
      };
    }
  }

  /**
   * Generate a random seed
   */
  private generateSeed(): number {
    return Math.floor(Math.random() * 2147483647);
  }

  /**
   * Extract last frame from previous shot's selected clip
   * Validates: Requirements 9.3
   */
  async extractLastFrameFromPreviousShot(previousShotId: string): Promise<{
    framePath: string;
    frameNumber: number;
  } | null> {
    // Get the selected clip from the previous shot
    const previousClips = await this.clipRepo.findByShotId(previousShotId);
    const selectedClip = previousClips.find((c) => c.isSelected);

    if (!selectedClip || !selectedClip.videoPath) {
      console.warn(`No selected clip found for previous shot: ${previousShotId}`);
      return null;
    }

    // Create directory for extracted frames
    const framesDir = path.join(this.storageBasePath, 'frames', previousShotId);
    await fs.mkdir(framesDir, { recursive: true });

    // Generate output path for the last frame
    const framePath = path.join(framesDir, `last_frame_${selectedClip.id}.png`);

    // Check if frame already exists
    try {
      await fs.access(framePath);
      console.log(`Using cached last frame: ${framePath}`);
      
      // Calculate frame number (last frame)
      const frameNumber = Math.floor(selectedClip.duration * selectedClip.fps) - 1;
      
      return {
        framePath,
        frameNumber,
      };
    } catch {
      // Frame doesn't exist, extract it
    }

    // Extract the last frame using FFmpeg
    await this.ffmpegService.extractLastFrame(selectedClip.videoPath, framePath);

    // Calculate frame number (last frame)
    const frameNumber = Math.floor(selectedClip.duration * selectedClip.fps) - 1;

    return {
      framePath,
      frameNumber,
    };
  }

  /**
   * Extract first frame from a clip for comparison
   */
  async extractFirstFrameFromClip(clipId: string): Promise<string> {
    const clip = await this.clipRepo.findById(clipId);
    if (!clip || !clip.videoPath) {
      throw new Error(`Clip not found or has no video: ${clipId}`);
    }

    // Create directory for extracted frames
    const framesDir = path.join(this.storageBasePath, 'frames', clip.shotId);
    await fs.mkdir(framesDir, { recursive: true });

    // Generate output path for the first frame
    const framePath = path.join(framesDir, `first_frame_${clip.id}.png`);

    // Check if frame already exists
    try {
      await fs.access(framePath);
      return framePath;
    } catch {
      // Frame doesn't exist, extract it
    }

    // Extract the first frame using FFmpeg
    await this.ffmpegService.extractFirstFrame(clip.videoPath, framePath);

    return framePath;
  }

  /**
   * Detect frame mismatch between two clips
   * Validates: Requirements 9.5
   */
  async detectFrameMismatch(
    clip1Id: string,
    clip2Id: string
  ): Promise<{
    hasMismatch: boolean;
    similarity: number;
    message: string;
  }> {
    try {
      // Extract last frame from first clip
      const clip1 = await this.clipRepo.findById(clip1Id);
      if (!clip1 || !clip1.videoPath) {
        throw new Error(`Clip 1 not found or has no video: ${clip1Id}`);
      }

      const framesDir1 = path.join(this.storageBasePath, 'frames', clip1.shotId);
      await fs.mkdir(framesDir1, { recursive: true });
      const lastFrame1 = path.join(framesDir1, `last_frame_${clip1.id}.png`);
      
      // Extract if not cached
      try {
        await fs.access(lastFrame1);
      } catch {
        await this.ffmpegService.extractLastFrame(clip1.videoPath, lastFrame1);
      }

      // Extract first frame from second clip
      const firstFrame2 = await this.extractFirstFrameFromClip(clip2Id);

      // Compare frames
      const comparison = await this.ffmpegService.compareFrames(lastFrame1, firstFrame2);

      const threshold = 0.85; // 85% similarity threshold
      const hasMismatch = !comparison.isMatch;

      return {
        hasMismatch,
        similarity: comparison.similarity,
        message: hasMismatch
          ? `Frame mismatch detected: ${(comparison.similarity * 100).toFixed(1)}% similarity (threshold: ${threshold * 100}%)`
          : `Frames match: ${(comparison.similarity * 100).toFixed(1)}% similarity`,
      };
    } catch (error: any) {
      throw new Error(`Failed to detect frame mismatch: ${error.message}`);
    }
  }

  /**
   * Compare frames between two images
   */
  async compareFrames(frame1Path: string, frame2Path: string): Promise<{
    similarity: number;
    isMatch: boolean;
  }> {
    return await this.ffmpegService.compareFrames(frame1Path, frame2Path);
  }
}
