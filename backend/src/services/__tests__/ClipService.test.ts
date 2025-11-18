import { ClipService } from '../ClipService';
import { ClipRepository } from '../../repositories/ClipRepository';
import { ShotRepository } from '../../repositories/ShotRepository';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import { SceneRepository } from '../../repositories/SceneRepository';
import { KeyframeRepository } from '../../repositories/KeyframeRepository';
import { AppDataSource } from '../../config/database';

describe('ClipService', () => {
  let clipService: ClipService;
  let clipRepo: ClipRepository;
  let shotRepo: ShotRepository;
  let projectRepo: ProjectRepository;
  let sceneRepo: SceneRepository;
  let keyframeRepo: KeyframeRepository;
  let testProjectId: string;
  let testSceneId: string;
  let testShotId: string;
  let testKeyframeId: string;

  beforeAll(async () => {
    await AppDataSource.initialize();
    clipService = new ClipService();
    clipRepo = new ClipRepository();
    shotRepo = new ShotRepository();
    projectRepo = new ProjectRepository();
    sceneRepo = new SceneRepository();
    keyframeRepo = new KeyframeRepository();

    // Create test data
    const project = await projectRepo.create({
      name: 'Clip Test Project',
      type: '产品介绍',
      targetDuration: 60,
    });
    testProjectId = project.id;

    const scene = await sceneRepo.create({
      projectId: testProjectId,
      sceneNumber: 1,
      title: 'Test Scene',
      estimatedDuration: 30,
    });
    testSceneId = scene.id;

    const shot = await shotRepo.create({
      projectId: testProjectId,
      sceneId: testSceneId,
      shotId: 'S1-01',
      sequenceNumber: 1,
      duration: 5,
      shotType: 'medium',
      subject: 'product',
      action: 'rotating',
      environment: 'studio',
    });
    testShotId = shot.id;

    const keyframe = await keyframeRepo.create({
      shotId: testShotId,
      version: 1,
      prompt: 'test prompt',
      workflowName: 'sdxl_text_to_image',
      steps: 20,
      cfg: 7.0,
      sampler: 'euler',
      width: 1024,
      height: 1024,
      seed: 12345,
      imagePath: '/test/image.png',
      isSelected: true,
      status: 'completed',
    });
    testKeyframeId = keyframe.id;
  });

  afterAll(async () => {
    // Clean up
    await projectRepo.delete(testProjectId);
    await AppDataSource.destroy();
  });

  describe('generateClip', () => {
    it('should throw error for invalid workflow', async () => {
      await expect(
        clipService.generateClip({
          shotId: testShotId,
          inputMode: 'text_to_video',
          prompt: 'A rotating product in a studio',
          workflowName: 'invalid_workflow',
          mode: 'demo',
        })
      ).rejects.toThrow('Workflow not found');
    });

    it('should throw error if keyframeId missing for image_to_video', async () => {
      await expect(
        clipService.generateClip({
          shotId: testShotId,
          inputMode: 'image_to_video',
          workflowName: 'svd_image_to_video',
        })
      ).rejects.toThrow('keyframeId is required');
    });

    it('should throw error for invalid shot', async () => {
      await expect(
        clipService.generateClip({
          shotId: 'invalid-shot-id',
          inputMode: 'text_to_video',
          workflowName: 'svd_image_to_video',
        })
      ).rejects.toThrow('Shot not found');
    });
  });

  describe('listClips', () => {
    it('should return empty array for shot with no clips', async () => {
      const clips = await clipService.listClips(testShotId);
      expect(clips).toBeDefined();
      expect(Array.isArray(clips)).toBe(true);
    });
  });

  describe('selectClip', () => {
    it('should return null for invalid clip id', async () => {
      const selected = await clipService.selectClip('invalid-clip-id');
      expect(selected).toBeNull();
    });
  });

  describe('getClipStatus', () => {
    it('should throw error for invalid clip id', async () => {
      await expect(
        clipService.getClipStatus('invalid-clip-id')
      ).rejects.toThrow('Clip not found');
    });
  });
});
