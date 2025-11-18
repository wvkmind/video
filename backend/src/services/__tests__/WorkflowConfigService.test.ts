import { WorkflowConfigService } from '../WorkflowConfigService';
import { validateWorkflowConfig } from '../../schemas/workflowConfigSchema';

describe('WorkflowConfigService', () => {
  let service: WorkflowConfigService;

  beforeEach(() => {
    service = new WorkflowConfigService();
  });

  describe('validateConfig', () => {
    it('should validate a correct workflow configuration', () => {
      const config = {
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image' as const,
        workflowJSON: {
          '1': {
            class_type: 'TestNode',
            inputs: {},
          },
        },
        parameters: [
          {
            name: 'steps',
            displayName: 'Steps',
            type: 'number' as const,
            defaultValue: 20,
            nodeId: '1',
            fieldPath: 'inputs.steps',
          },
        ],
      };

      const result = service.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration with missing required fields', () => {
      const config = {
        name: 'test_workflow',
        // missing displayName
        type: 'text_to_image' as const,
        workflowJSON: {},
        parameters: [],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject configuration with invalid type', () => {
      const config = {
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'invalid_type' as any,
        workflowJSON: {},
        parameters: [],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('type'))).toBe(true);
    });

    it('should validate parameter with correct structure', () => {
      const config = {
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image' as const,
        workflowJSON: {},
        parameters: [
          {
            name: 'cfg',
            displayName: 'CFG Scale',
            type: 'number' as const,
            defaultValue: 7.5,
            min: 1.0,
            max: 20.0,
            step: 0.5,
            nodeId: '5',
            fieldPath: 'inputs.cfg',
          },
        ],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject parameter with missing required fields', () => {
      const config = {
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image' as const,
        workflowJSON: {},
        parameters: [
          {
            name: 'steps',
            // missing displayName, type, defaultValue, nodeId, fieldPath
          } as any,
        ],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject select parameter without options', () => {
      const config = {
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image' as const,
        workflowJSON: {},
        parameters: [
          {
            name: 'sampler',
            displayName: 'Sampler',
            type: 'select' as const,
            defaultValue: 'euler',
            // missing options
            nodeId: '5',
            fieldPath: 'inputs.sampler_name',
          },
        ],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('options'))).toBe(true);
    });

    it('should validate number parameter with min/max/step', () => {
      const config = {
        name: 'test_workflow',
        displayName: 'Test Workflow',
        type: 'text_to_image' as const,
        workflowJSON: {},
        parameters: [
          {
            name: 'steps',
            displayName: 'Steps',
            type: 'number' as const,
            defaultValue: 30,
            min: 1,
            max: 150,
            step: 1,
            nodeId: '5',
            fieldPath: 'inputs.steps',
          },
        ],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('workflow type validation', () => {
    it('should accept text_to_image type', () => {
      const config = {
        name: 'test',
        displayName: 'Test',
        type: 'text_to_image' as const,
        workflowJSON: {},
        parameters: [],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should accept image_to_video type', () => {
      const config = {
        name: 'test',
        displayName: 'Test',
        type: 'image_to_video' as const,
        workflowJSON: {},
        parameters: [],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should accept text_to_video type', () => {
      const config = {
        name: 'test',
        displayName: 'Test',
        type: 'text_to_video' as const,
        workflowJSON: {},
        parameters: [],
      };

      const result = validateWorkflowConfig(config);
      expect(result.valid).toBe(true);
    });
  });
});
