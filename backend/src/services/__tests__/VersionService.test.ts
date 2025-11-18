import { VersionService } from '../VersionService';
import { StoryService } from '../StoryService';
import { ProjectService } from '../ProjectService';
import { AppDataSource } from '../../config/database';

describe('VersionService', () => {
  let versionService: VersionService;
  let storyService: StoryService;
  let projectService: ProjectService;
  let testProjectId: string;
  let testStoryId: string;

  beforeAll(async () => {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    versionService = new VersionService();
    storyService = new StoryService();
    projectService = new ProjectService();
  });

  afterAll(async () => {
    // Clean up test data
    if (testProjectId) {
      try {
        await projectService.deleteProject(testProjectId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(async () => {
    // Create a test project and story for each test
    const project = await projectService.createProject({
      name: 'Version Test Project',
      type: 'Test',
      targetDuration: 60,
    });
    testProjectId = project.id;

    // Create initial story by updating it
    const story = await storyService.updateStory(testProjectId, {
      hook: 'Initial hook',
    });
    testStoryId = story.id;
  });

  afterEach(async () => {
    // Clean up after each test
    if (testProjectId) {
      try {
        await projectService.deleteProject(testProjectId);
      } catch (error) {
        // Ignore errors
      }
    }
  });

  describe('createVersion', () => {
    it('should create a version snapshot for a story', async () => {
      // Update story first
      const updatedStory = await storyService.updateStory(testProjectId, {
        hook: 'Test hook',
        middleStructure: 'Test middle',
        ending: 'Test ending',
      });

      // Create version
      const version = await versionService.createVersion(
        'story',
        testStoryId,
        {
          hook: updatedStory.hook,
          middleStructure: updatedStory.middleStructure,
          ending: updatedStory.ending,
        },
        {
          versionName: 'Initial version',
          changeSummary: 'Created initial story',
        }
      );

      expect(version).toBeDefined();
      expect(version.entityType).toBe('story');
      expect(version.entityId).toBe(testStoryId);
      expect(version.versionNumber).toBe(1);
      expect(version.versionName).toBe('Initial version');
      expect(version.snapshot.hook).toBe('Test hook');
    });

    it('should increment version number for subsequent versions', async () => {
      // Create first version
      await versionService.createVersion('story', testStoryId, {
        hook: 'Version 1',
      });

      // Create second version
      const version2 = await versionService.createVersion('story', testStoryId, {
        hook: 'Version 2',
      });

      expect(version2.versionNumber).toBe(2);
    });

    it('should throw error for invalid entity type', async () => {
      await expect(
        versionService.createVersion(
          'invalid' as any,
          testStoryId,
          { data: 'test' }
        )
      ).rejects.toThrow('Invalid entity type');
    });
  });

  describe('listVersions', () => {
    it('should list all versions for an entity', async () => {
      // Create multiple versions
      await versionService.createVersion('story', testStoryId, { hook: 'V1' });
      await versionService.createVersion('story', testStoryId, { hook: 'V2' });
      await versionService.createVersion('story', testStoryId, { hook: 'V3' });

      const versions = await versionService.listVersions('story', testStoryId);

      expect(versions).toHaveLength(3);
      expect(versions[0].versionNumber).toBe(3); // Newest first
      expect(versions[1].versionNumber).toBe(2);
      expect(versions[2].versionNumber).toBe(1);
    });

    it('should return empty array for entity with no versions', async () => {
      const versions = await versionService.listVersions('story', testStoryId);
      expect(versions).toHaveLength(0);
    });
  });

  describe('restoreVersion', () => {
    it('should restore entity to a previous version', async () => {
      // Update story
      await storyService.updateStory(testProjectId, {
        hook: 'Original hook',
        middleStructure: 'Original middle',
      });

      // Create version 1
      const version1 = await versionService.createVersion('story', testStoryId, {
        hook: 'Original hook',
        middleStructure: 'Original middle',
      });

      // Update story again
      await storyService.updateStory(testProjectId, {
        hook: 'Modified hook',
        middleStructure: 'Modified middle',
      });

      // Restore to version 1
      const restoredStory = await versionService.restoreVersion(version1.id);

      expect(restoredStory.hook).toBe('Original hook');
      expect(restoredStory.middleStructure).toBe('Original middle');
    });

    it('should create a new version record after restoration', async () => {
      // Create initial version
      const version1 = await versionService.createVersion('story', testStoryId, {
        hook: 'V1',
      });

      // Restore
      await versionService.restoreVersion(version1.id);

      // Check that a new version was created
      const versions = await versionService.listVersions('story', testStoryId);
      expect(versions.length).toBeGreaterThan(1);
      expect(versions[0].changeSummary).toContain('Restored');
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions and show differences', async () => {
      // Create version 1
      const version1 = await versionService.createVersion('story', testStoryId, {
        hook: 'Hook 1',
        middleStructure: 'Middle 1',
        ending: 'Ending 1',
      });

      // Create version 2
      const version2 = await versionService.createVersion('story', testStoryId, {
        hook: 'Hook 2',
        middleStructure: 'Middle 1', // Same as v1
        ending: 'Ending 2',
      });

      const comparison = await versionService.compareVersions(
        version1.id,
        version2.id
      );

      expect(comparison.version1.id).toBe(version1.id);
      expect(comparison.version2.id).toBe(version2.id);
      expect(comparison.differences).toBeDefined();

      // Find the hook difference
      const hookDiff = comparison.differences.find((d) => d.field === 'hook');
      expect(hookDiff?.changed).toBe(true);
      expect(hookDiff?.value1).toBe('Hook 1');
      expect(hookDiff?.value2).toBe('Hook 2');

      // Find the middleStructure (should be unchanged)
      const middleDiff = comparison.differences.find(
        (d) => d.field === 'middleStructure'
      );
      expect(middleDiff?.changed).toBe(false);
    });

    it('should throw error when comparing versions of different entities', async () => {
      // Create another project and story
      const project2 = await projectService.createProject({
        name: 'Project 2',
        type: 'Test',
        targetDuration: 60,
      });
      const story2 = await storyService.updateStory(project2.id, {
        hook: 'Story 2 hook',
      });

      // Create versions for different stories
      const version1 = await versionService.createVersion('story', testStoryId, {
        hook: 'V1',
      });
      const version2 = await versionService.createVersion('story', story2.id, {
        hook: 'V2',
      });

      await expect(
        versionService.compareVersions(version1.id, version2.id)
      ).rejects.toThrow('Cannot compare versions of different entities');

      // Cleanup
      await projectService.deleteProject(project2.id);
    });
  });

  describe('getCurrentVersionNumber', () => {
    it('should return 0 for entity with no versions', async () => {
      const versionNumber = await versionService.getCurrentVersionNumber(
        'story',
        testStoryId
      );
      expect(versionNumber).toBe(0);
    });

    it('should return latest version number', async () => {
      await versionService.createVersion('story', testStoryId, { hook: 'V1' });
      await versionService.createVersion('story', testStoryId, { hook: 'V2' });
      await versionService.createVersion('story', testStoryId, { hook: 'V3' });

      const versionNumber = await versionService.getCurrentVersionNumber(
        'story',
        testStoryId
      );
      expect(versionNumber).toBe(3);
    });
  });
});
