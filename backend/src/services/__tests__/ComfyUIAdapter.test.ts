import { AppDataSource } from '../../config/database';
import { ComfyUIAdapter } from '../ComfyUIAdapter';
import { WorkflowConfig } from '../../entities/WorkflowConfig';

describe('ComfyUIAdapter', () => {
  let adapter: ComfyUIAdapter;
  let workflowRepository: any;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    adapter = new ComfyUIAdapter();
    workflowRepository = AppDataSource.getRepository(WorkflowConfig);
    
    // Clean up workflows
    await AppDataSource.query('DELETE FROM workflow_configs');
  });

  describe('loadWorkflows', () => {
    it('should load active workflows from database', async () => {
      // Create test workflows
      const workflow1 = workflowRepository.create({
        name: 'test_workflow_1',
        displayName: 'Test Workflow 1',
        type: 'text_to_image',
        workflowJSON: { node1: { class_type: 'TestNode' } },
        parameters: [],
        isActive: true,
      });
      await workflowRepository.save(workflow1);

      const workflow2 = workflowRepository.create({
        name: 'test_workflow_2',
        displayName: 'Test Workflow 2',
        type: 'image_to_video',
        workflowJSON: { node2: { class_type: 'TestNode2' } },
        parameters: [],
        isActive: true,
      });
      await workflowRepository.save(workflow2);

      // Create inactive workflow (should not be loaded)
      const workflow3 = workflowRepository.create({
        name: 'inactive_workflow',
        displayName: 'Inactive Workflow',
        type: 'text_to_image',
        workflowJSON: {},
        parameters: [],
        isActive: false,
      });
      await workflowRepository.save(workflow3);

      const workflows = await adapter.loadWorkflows();

      expect(workflows.length).toBe(2);
      expect(workflows.map(w => w.name)).toContain('test_workflow_1');
      expect(workflows.map(w => w.name)).toContain('test_workflow_2');
      expect(workflows.map(w => w.name)).not.toContain('inactive_workflow');
    });

    it('should handle empty workflow list', async () => {
      const workflows = await adapter.loadWorkflows();
      expect(workflows).toEqual([]);
    });
  });

  describe('getWorkflow', () => {
    it('should get workflow by name', async () => {
      const workflow = workflowRepository.create({
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image',
        workflowJSON: { node1: { class_type: 'TestNode' } },
        parameters: [],
        isActive: true,
      });
      await workflowRepository.save(workflow);

      const result = await adapter.getWorkflow('test_workflow');

      expect(result.name).toBe('test_workflow');
      expect(result.displayName).toBe('Test Workflow');
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(adapter.getWorkflow('non_existent')).rejects.toThrow(
        'Workflow not found'
      );
    });

    it('should not return inactive workflows', async () => {
      const workflow = workflowRepository.create({
        name: 'inactive_workflow',
        displayName: 'Inactive Workflow',
        type: 'text_to_image',
        workflowJSON: {},
        parameters: [],
        isActive: false,
      });
      await workflowRepository.save(workflow);

      await expect(adapter.getWorkflow('inactive_workflow')).rejects.toThrow(
        'Workflow not found'
      );
    });
  });

  describe('buildWorkflowJSON', () => {
    it('should build workflow JSON with parameter overrides', async () => {
      const workflow = workflowRepository.create({
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image',
        workflowJSON: {
          node1: {
            class_type: 'KSampler',
            inputs: {
              steps: 20,
              cfg: 7.0,
              seed: 12345,
            },
          },
        },
        parameters: [
          {
            name: 'steps',
            displayName: 'Steps',
            type: 'number',
            defaultValue: 20,
            nodeId: 'node1',
            fieldPath: 'inputs.steps',
          },
          {
            name: 'cfg',
            displayName: 'CFG Scale',
            type: 'number',
            defaultValue: 7.0,
            nodeId: 'node1',
            fieldPath: 'inputs.cfg',
          },
        ],
        isActive: true,
      });
      await workflowRepository.save(workflow);

      const result = await adapter.buildWorkflowJSON('test_workflow', {
        workflowName: 'test_workflow',
        steps: 30,
        cfg: 8.5,
      });

      expect(result.node1.inputs.steps).toBe(30);
      expect(result.node1.inputs.cfg).toBe(8.5);
      expect(result.node1.inputs.seed).toBe(12345); // Unchanged
    });

    it('should use default values when parameters not provided', async () => {
      const workflow = workflowRepository.create({
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image',
        workflowJSON: {
          node1: {
            class_type: 'KSampler',
            inputs: {},
          },
        },
        parameters: [
          {
            name: 'steps',
            displayName: 'Steps',
            type: 'number',
            defaultValue: 25,
            nodeId: 'node1',
            fieldPath: 'inputs.steps',
          },
        ],
        isActive: true,
      });
      await workflowRepository.save(workflow);

      const result = await adapter.buildWorkflowJSON('test_workflow', {
        workflowName: 'test_workflow',
      });

      expect(result.node1.inputs.steps).toBe(25);
    });

    it('should handle nested field paths', async () => {
      const workflow = workflowRepository.create({
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image',
        workflowJSON: {
          node1: {
            class_type: 'TestNode',
            inputs: {
              advanced: {
                sampling: {
                  method: 'euler',
                },
              },
            },
          },
        },
        parameters: [
          {
            name: 'sampler',
            displayName: 'Sampler',
            type: 'string',
            defaultValue: 'euler',
            nodeId: 'node1',
            fieldPath: 'inputs.advanced.sampling.method',
          },
        ],
        isActive: true,
      });
      await workflowRepository.save(workflow);

      const result = await adapter.buildWorkflowJSON('test_workflow', {
        workflowName: 'test_workflow',
        sampler: 'dpm++',
      });

      expect(result.node1.inputs.advanced.sampling.method).toBe('dpm++');
    });

    it('should throw error for invalid node ID', async () => {
      const workflow = workflowRepository.create({
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image',
        workflowJSON: {
          node1: {
            class_type: 'TestNode',
            inputs: {},
          },
        },
        parameters: [
          {
            name: 'steps',
            displayName: 'Steps',
            type: 'number',
            defaultValue: 20,
            nodeId: 'non_existent_node',
            fieldPath: 'inputs.steps',
          },
        ],
        isActive: true,
      });
      await workflowRepository.save(workflow);

      await expect(
        adapter.buildWorkflowJSON('test_workflow', {
          workflowName: 'test_workflow',
          steps: 30,
        })
      ).rejects.toThrow('Node not found in workflow');
    });

    it('should not modify original workflow JSON', async () => {
      const originalJSON = {
        node1: {
          class_type: 'KSampler',
          inputs: {
            steps: 20,
          },
        },
      };

      const workflow = workflowRepository.create({
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image',
        workflowJSON: originalJSON,
        parameters: [
          {
            name: 'steps',
            displayName: 'Steps',
            type: 'number',
            defaultValue: 20,
            nodeId: 'node1',
            fieldPath: 'inputs.steps',
          },
        ],
        isActive: true,
      });
      await workflowRepository.save(workflow);

      await adapter.buildWorkflowJSON('test_workflow', {
        workflowName: 'test_workflow',
        steps: 50,
      });

      // Verify original is unchanged
      const reloaded = await adapter.getWorkflow('test_workflow');
      expect((reloaded.workflowJSON as any).node1.inputs.steps).toBe(20);
    });
  });
});
