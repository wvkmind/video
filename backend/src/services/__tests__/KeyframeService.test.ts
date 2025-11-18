import { KeyframeService } from '../KeyframeService';
import { KeyframeRepository } from '../../repositories/KeyframeRepository';
import { ShotRepository } from '../../repositories/ShotRepository';
import { SceneRepository } from '../../repositories/SceneRepository';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import { AppDataSource } from '../../config/database';

describe('KeyframeService', () => {
  let keyframeService: KeyframeService;
  let keyframeRepo: KeyframeRepository;
  let shotRepo: ShotRepository;
  let sceneRepo: SceneRepository;
  let projectRepo: ProjectRepository;
  let testProjectId: string;
  let testSceneId: string;

  beforeAll(async () => {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    projectRepo = new ProjectRepository();
    sceneRepo = new SceneRepository();
    shotRepo = new ShotRepository();
    keyframeRepo = new KeyframeRepository();
  });

  beforeEach(async () => {
    keyframeService = new KeyframeService();

    // Create test project and scene for foreign key constraints
    const project = await projectRepo.create({
      name: 'Keyframe Test Project',
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
  });

  afterEach(async () => {
    // Clean up - delete project (cascades to scenes and shots)
    if (testProjectId) {
      await projectRepo.delete(testProjectId);
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('generatePrompt', () => {
    it('should generate prompt from shot fields', async () => {
      // Create a test shot with all fields
      const shot = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
        environment: 'indoor office',
        subject: 'businessman in suit',
        action: 'typing on laptop',
        cameraMovement: 'slow zoom in',
        lighting: 'soft natural light',
        style: 'cinematic',
      });

      const prompt = await keyframeService.generatePrompt(shot.id);

      // Verify prompt contains all fields
      expect(prompt).toContain('indoor office');
      expect(prompt).toContain('businessman in suit');
      expect(prompt).toContain('typing on laptop');
      expect(prompt).toContain('camera slow zoom in');
      expect(prompt).toContain('soft natural light');
      expect(prompt).toContain('cinematic');
    });

    it('should handle empty fields gracefully', async () => {
      // Create a shot with minimal fields
      const shot = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-02',
        sequenceNumber: 2,
        duration: 5,
        shotType: 'wide',
      });

      const prompt = await keyframeService.generatePrompt(shot.id);

      // Should return default prompt when no fields are set
      expect(prompt).toBe('a cinematic scene');
    });

    it('should throw error for non-existent shot', async () => {
      await expect(
        keyframeService.generatePrompt('non-existent-id')
      ).rejects.toThrow('Shot not found');
    });
  });

  describe('listKeyframes', () => {
    it('should return empty array for shot with no keyframes', async () => {
      const keyframes = await keyframeService.listKeyframes('test-shot-id');
      expect(keyframes).toEqual([]);
    });
  });

  describe('getKeyframe', () => {
    it('should return null for non-existent keyframe', async () => {
      const keyframe = await keyframeService.getKeyframe('non-existent-id');
      expect(keyframe).toBeNull();
    });
  });
});
