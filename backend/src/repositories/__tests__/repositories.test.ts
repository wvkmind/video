import { AppDataSource } from '../../config/database';
import { ProjectRepository } from '../ProjectRepository';
import { StoryRepository } from '../StoryRepository';
import { SceneRepository } from '../SceneRepository';
import { ShotRepository } from '../ShotRepository';

describe('Repository Tests', () => {
  let projectRepo: ProjectRepository;
  let storyRepo: StoryRepository;
  let sceneRepo: SceneRepository;
  let shotRepo: ShotRepository;

  beforeAll(async () => {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    projectRepo = new ProjectRepository();
    storyRepo = new StoryRepository();
    sceneRepo = new SceneRepository();
    shotRepo = new ShotRepository();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('ProjectRepository', () => {
    it('should create a new project', async () => {
      const project = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
        targetStyle: '电影感',
        targetAudience: '年轻人',
        notes: 'Test notes',
      });

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.status).toBe('draft');
      
      // Clean up
      await projectRepo.delete(project.id);
    });

    it('should find project by id', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });
      
      const project = await projectRepo.findById(created.id);
      expect(project).toBeDefined();
      expect(project?.name).toBe('Test Project');
      
      // Clean up
      await projectRepo.delete(created.id);
    });

    it('should find all projects', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });
      
      const projects = await projectRepo.findAll();
      expect(projects.length).toBeGreaterThan(0);
      
      // Clean up
      await projectRepo.delete(created.id);
    });

    it('should find projects with pagination', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });
      
      const result = await projectRepo.findWithPagination(1, 10);
      expect(result.data).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      
      // Clean up
      await projectRepo.delete(created.id);
    });

    it('should update project', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });
      
      const updated = await projectRepo.update(created.id, {
        name: 'Updated Project',
      });
      expect(updated?.name).toBe('Updated Project');
      
      // Clean up
      await projectRepo.delete(created.id);
    });

    it('should find projects by status', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });
      
      const projects = await projectRepo.findByStatus('draft');
      expect(projects.length).toBeGreaterThan(0);
      
      // Clean up
      await projectRepo.delete(created.id);
    });

    it('should archive project', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });
      
      const archived = await projectRepo.archive(created.id);
      expect(archived?.status).toBe('archived');
      
      // Clean up
      await projectRepo.delete(created.id);
    });

    it('should count projects by status', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });
      await projectRepo.archive(created.id);
      
      // Verify the project was archived
      const archived = await projectRepo.findById(created.id);
      expect(archived?.status).toBe('archived');
      
      const count = await projectRepo.countByStatus('archived');
      expect(count).toBeGreaterThanOrEqual(1);
      
      // Clean up
      await projectRepo.delete(created.id);
    });

    it('should delete project', async () => {
      const created = await projectRepo.create({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });
      
      const deleted = await projectRepo.delete(created.id);
      expect(deleted).toBe(true);
    });
  });

  describe('StoryRepository', () => {
    let testProjectId: string;
    let testStoryId: string;

    beforeEach(async () => {
      const project = await projectRepo.create({
        name: 'Story Test Project',
        type: '剧情短片',
        targetDuration: 120,
      });
      testProjectId = project.id;
    });

    afterEach(async () => {
      // Delete story first due to foreign key constraint
      const story = await storyRepo.findByProjectId(testProjectId);
      if (story) {
        await storyRepo.delete(story.id);
      }
      await projectRepo.delete(testProjectId);
    });

    it('should create a story', async () => {
      const story = await storyRepo.create({
        projectId: testProjectId,
        hook: 'Test hook',
        middleStructure: 'Test middle',
        ending: 'Test ending',
        version: 1,
      });

      expect(story.id).toBeDefined();
      expect(story.hook).toBe('Test hook');
      testStoryId = story.id;
    });

    it('should find story by project id', async () => {
      // First create a story
      await storyRepo.create({
        projectId: testProjectId,
        hook: 'Test hook',
        middleStructure: 'Test middle',
        ending: 'Test ending',
        version: 1,
      });

      const story = await storyRepo.findByProjectId(testProjectId);
      expect(story).toBeDefined();
      expect(story?.projectId).toBe(testProjectId);
    });

    it('should update story and increment version', async () => {
      // First create a story
      await storyRepo.create({
        projectId: testProjectId,
        hook: 'Test hook',
        middleStructure: 'Test middle',
        ending: 'Test ending',
        version: 1,
      });

      const updated = await storyRepo.updateStory(testProjectId, {
        hook: 'Updated hook',
      });
      expect(updated.hook).toBe('Updated hook');
      expect(updated.version).toBe(2);
    });

    it('should get story by project id after update', async () => {
      // First create a story
      await storyRepo.create({
        projectId: testProjectId,
        hook: 'Test hook',
        middleStructure: 'Test middle',
        ending: 'Test ending',
        version: 1,
      });

      // Update it
      await storyRepo.updateStory(testProjectId, {
        hook: 'Updated hook',
      });

      const story = await storyRepo.findByProjectId(testProjectId);
      expect(story).toBeDefined();
      expect(story?.version).toBe(2);
    });

    it('should get latest version number', async () => {
      // First create a story
      await storyRepo.create({
        projectId: testProjectId,
        hook: 'Test hook',
        middleStructure: 'Test middle',
        ending: 'Test ending',
        version: 1,
      });

      // Update it
      await storyRepo.updateStory(testProjectId, {
        hook: 'Updated hook',
      });

      const version = await storyRepo.getLatestVersion(testProjectId);
      expect(version).toBe(2);
    });
  });

  describe('SceneRepository', () => {
    let testProjectId: string;
    let testSceneId: string;

    beforeEach(async () => {
      const project = await projectRepo.create({
        name: 'Scene Test Project',
        type: 'MV',
        targetDuration: 180,
      });
      testProjectId = project.id;
    });

    afterEach(async () => {
      // Clean up - delete project (cascades to scenes)
      await projectRepo.delete(testProjectId);
    });

    it('should create a scene', async () => {
      const scene = await sceneRepo.create({
        projectId: testProjectId,
        sceneNumber: 1,
        title: 'Scene 1',
        description: 'Test scene',
        estimatedDuration: 30,
        voiceoverText: 'Test voiceover',
      });

      expect(scene.id).toBeDefined();
      expect(scene.title).toBe('Scene 1');
      testSceneId = scene.id;
    });

    it('should find scenes by project id', async () => {
      const scene = await sceneRepo.create({
        projectId: testProjectId,
        sceneNumber: 1,
        title: 'Scene 1',
        description: 'Test scene',
        estimatedDuration: 30,
        voiceoverText: 'Test voiceover',
      });

      const scenes = await sceneRepo.findByProjectId(testProjectId);
      expect(scenes.length).toBe(1);
      expect(scenes[0].projectId).toBe(testProjectId);
    });

    it('should get next scene number', async () => {
      await sceneRepo.create({
        projectId: testProjectId,
        sceneNumber: 1,
        title: 'Scene 1',
        estimatedDuration: 30,
      });

      const nextNumber = await sceneRepo.getNextSceneNumber(testProjectId);
      expect(nextNumber).toBe(2);
    });

    it('should update voiceover and increment version', async () => {
      const scene = await sceneRepo.create({
        projectId: testProjectId,
        sceneNumber: 1,
        title: 'Scene 1',
        estimatedDuration: 30,
        voiceoverText: 'Test voiceover',
      });

      const updated = await sceneRepo.updateVoiceover(scene.id, 'Updated voiceover');
      expect(updated.voiceoverText).toBe('Updated voiceover');
      expect(updated.version).toBe(2);
    });

    it('should count scenes in project', async () => {
      await sceneRepo.create({
        projectId: testProjectId,
        sceneNumber: 1,
        title: 'Scene 1',
        estimatedDuration: 30,
      });

      const count = await sceneRepo.countByProjectId(testProjectId);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('ShotRepository', () => {
    let testProjectId: string;
    let testSceneId: string;
    let testShotId: string;

    beforeEach(async () => {
      const project = await projectRepo.create({
        name: 'Shot Test Project',
        type: '产品介绍',
        targetDuration: 90,
      });
      testProjectId = project.id;

      const scene = await sceneRepo.create({
        projectId: testProjectId,
        sceneNumber: 1,
        title: 'Scene 1',
        estimatedDuration: 30,
      });
      testSceneId = scene.id;
    });

    afterEach(async () => {
      // Clean up - delete project (cascades to scenes and shots)
      await projectRepo.delete(testProjectId);
    });

    it('should create a shot', async () => {
      const shot = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
        description: 'Test shot',
        environment: 'Indoor',
        subject: 'Person',
        action: 'Walking',
      });

      expect(shot.id).toBeDefined();
      expect(shot.shotId).toBe('S1-01');
      testShotId = shot.id;
    });

    it('should find shots by project id', async () => {
      const shot = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
      });

      const shots = await shotRepo.findByProjectId(testProjectId);
      expect(shots.length).toBe(1);
      expect(shots[0].projectId).toBe(testProjectId);
    });

    it('should find shots by scene id', async () => {
      const shot = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
      });

      const shots = await shotRepo.findBySceneId(testSceneId);
      expect(shots.length).toBe(1);
      expect(shots[0].sceneId).toBe(testSceneId);
    });

    it('should get next sequence number', async () => {
      await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
      });

      const nextNumber = await shotRepo.getNextSequenceNumber(testProjectId);
      expect(nextNumber).toBe(2);
    });

    it('should create multiple shots and reorder them', async () => {
      const shot1 = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
      });

      const shot2 = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-02',
        sequenceNumber: 2,
        duration: 5,
        shotType: 'closeup',
      });

      const shot3 = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-03',
        sequenceNumber: 3,
        duration: 5,
        shotType: 'wide',
      });

      // Reorder: shot3, shot2, shot1
      await shotRepo.reorderShots([shot3.id, shot2.id, shot1.id]);

      const reordered = await shotRepo.findByProjectId(testProjectId);
      expect(reordered[0].id).toBe(shot3.id);
      expect(reordered[0].sequenceNumber).toBe(1);
      expect(reordered[1].id).toBe(shot2.id);
      expect(reordered[1].sequenceNumber).toBe(2);
      expect(reordered[2].id).toBe(shot1.id);
      expect(reordered[2].sequenceNumber).toBe(3);
    });

    it('should set transition relationship', async () => {
      const shot1 = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
      });

      const shot2 = await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-02',
        sequenceNumber: 2,
        duration: 5,
        shotType: 'closeup',
      });

      await shotRepo.setTransitionRelationship(
        shot2.id,
        shot1.id,
        null,
        'dissolve',
        true
      );

      const updated = await shotRepo.findById(shot2.id);
      expect(updated?.previousShotId).toBe(shot1.id);
      expect(updated?.transitionType).toBe('dissolve');
      expect(updated?.useLastFrameAsFirst).toBe(true);
    });

    it('should count shots in project', async () => {
      await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
      });

      await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-02',
        sequenceNumber: 2,
        duration: 5,
        shotType: 'closeup',
      });

      await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-03',
        sequenceNumber: 3,
        duration: 5,
        shotType: 'wide',
      });

      const count = await shotRepo.countByProjectId(testProjectId);
      expect(count).toBe(3);
    });

    it('should export storyboard', async () => {
      await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-01',
        sequenceNumber: 1,
        duration: 5,
        shotType: 'medium',
      });

      await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-02',
        sequenceNumber: 2,
        duration: 5,
        shotType: 'closeup',
      });

      await shotRepo.create({
        projectId: testProjectId,
        sceneId: testSceneId,
        shotId: 'S1-03',
        sequenceNumber: 3,
        duration: 5,
        shotType: 'wide',
      });

      const shots = await shotRepo.exportStoryboard(testProjectId);
      expect(shots.length).toBe(3);
      expect(shots[0].scene).toBeDefined();
    });
  });
});
