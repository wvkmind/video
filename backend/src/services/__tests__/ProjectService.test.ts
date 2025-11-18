import { AppDataSource } from '../../config/database';
import { ProjectService } from '../ProjectService';
import { Project } from '../../entities/Project';

describe('ProjectService', () => {
  let projectService: ProjectService;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    projectService = new ProjectService();
    // Clean up database before each test - delete in correct order due to foreign keys
    await AppDataSource.query('DELETE FROM keyframes');
    await AppDataSource.query('DELETE FROM clips');
    await AppDataSource.query('DELETE FROM shots');
    await AppDataSource.query('DELETE FROM scenes');
    await AppDataSource.query('DELETE FROM stories');
    await AppDataSource.query('DELETE FROM character_presets');
    await AppDataSource.query('DELETE FROM timelines');
    await AppDataSource.query('DELETE FROM projects');
  });

  describe('createProject', () => {
    it('should create a project with all fields', async () => {
      const projectData = {
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
        targetStyle: '电影感',
        targetAudience: '年轻人',
        notes: 'Test notes',
      };

      const project = await projectService.createProject(projectData);

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.type).toBe('产品介绍');
      expect(project.targetDuration).toBe(60);
      expect(project.status).toBe('draft');
    });

    it('should reject project with empty name', async () => {
      const projectData = {
        name: '',
        type: '产品介绍',
        targetDuration: 60,
      };

      await expect(projectService.createProject(projectData)).rejects.toThrow(
        'Project name is required'
      );
    });

    it('should reject project with negative duration', async () => {
      const projectData = {
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: -10,
      };

      await expect(projectService.createProject(projectData)).rejects.toThrow(
        'Target duration must be a positive number'
      );
    });
  });

  describe('getProject', () => {
    it('should get project by id', async () => {
      const created = await projectService.createProject({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });

      const project = await projectService.getProject(created.id);

      expect(project.id).toBe(created.id);
      expect(project.name).toBe('Test Project');
    });

    it('should throw error for non-existent project', async () => {
      await expect(projectService.getProject('non-existent-id')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('listProjects', () => {
    it('should list all projects', async () => {
      await projectService.createProject({
        name: 'Project 1',
        type: '产品介绍',
        targetDuration: 60,
      });
      await projectService.createProject({
        name: 'Project 2',
        type: '剧情短片',
        targetDuration: 120,
      });

      const result = await projectService.listProjects();

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should filter projects by status', async () => {
      const project1 = await projectService.createProject({
        name: 'Project 1',
        type: '产品介绍',
        targetDuration: 60,
      });
      await projectService.createProject({
        name: 'Project 2',
        type: '剧情短片',
        targetDuration: 120,
      });
      await projectService.archiveProject(project1.id);

      const result = await projectService.listProjects({ status: 'archived' });

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe('archived');
    });
  });

  describe('updateProject', () => {
    it('should update project fields', async () => {
      const created = await projectService.createProject({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });

      const updated = await projectService.updateProject(created.id, {
        name: 'Updated Project',
        targetDuration: 90,
      });

      expect(updated.name).toBe('Updated Project');
      expect(updated.targetDuration).toBe(90);
    });
  });

  describe('archiveProject', () => {
    it('should archive a project', async () => {
      const created = await projectService.createProject({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });

      const archived = await projectService.archiveProject(created.id);

      expect(archived.status).toBe('archived');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const created = await projectService.createProject({
        name: 'Test Project',
        type: '产品介绍',
        targetDuration: 60,
      });

      await projectService.deleteProject(created.id);

      await expect(projectService.getProject(created.id)).rejects.toThrow('not found');
    });
  });

  describe('duplicateProject', () => {
    it('should duplicate a project with basic data', async () => {
      const original = await projectService.createProject({
        name: 'Original Project',
        type: '产品介绍',
        targetDuration: 60,
        targetStyle: '电影感',
      });

      const duplicate = await projectService.duplicateProject(original.id);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('Original Project (Copy)');
      expect(duplicate.type).toBe(original.type);
      expect(duplicate.targetDuration).toBe(original.targetDuration);
      expect(duplicate.status).toBe('draft');
    });
  });
});
