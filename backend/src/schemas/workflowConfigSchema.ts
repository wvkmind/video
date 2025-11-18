/**
 * JSON Schema for WorkflowConfig validation
 * Defines the structure and validation rules for ComfyUI workflow configurations
 */

export interface WorkflowConfigSchema {
  name: string;
  displayName: string;
  type: 'text_to_image' | 'image_to_video' | 'text_to_video';
  workflowJSON: object;
  parameters: WorkflowParameterSchema[];
  isActive?: boolean;
}

export interface WorkflowParameterSchema {
  name: string;
  displayName: string;
  type: 'number' | 'string' | 'select';
  defaultValue: any;
  options?: any[];
  nodeId: string;
  fieldPath: string;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Validates a workflow configuration object
 */
export function validateWorkflowConfig(
  config: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!config.name || typeof config.name !== 'string') {
    errors.push('name is required and must be a string');
  }

  if (!config.displayName || typeof config.displayName !== 'string') {
    errors.push('displayName is required and must be a string');
  }

  if (
    !config.type ||
    !['text_to_image', 'image_to_video', 'text_to_video'].includes(config.type)
  ) {
    errors.push(
      'type is required and must be one of: text_to_image, image_to_video, text_to_video'
    );
  }

  if (!config.workflowJSON || typeof config.workflowJSON !== 'object') {
    errors.push('workflowJSON is required and must be an object');
  }

  if (!Array.isArray(config.parameters)) {
    errors.push('parameters is required and must be an array');
  } else {
    // Validate each parameter
    config.parameters.forEach((param: any, index: number) => {
      const paramErrors = validateWorkflowParameter(param);
      if (paramErrors.length > 0) {
        errors.push(
          `Parameter ${index} (${param.name || 'unnamed'}): ${paramErrors.join(', ')}`
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a workflow parameter
 */
export function validateWorkflowParameter(param: any): string[] {
  const errors: string[] = [];

  if (!param.name || typeof param.name !== 'string') {
    errors.push('name is required and must be a string');
  }

  if (!param.displayName || typeof param.displayName !== 'string') {
    errors.push('displayName is required and must be a string');
  }

  if (!param.type || !['number', 'string', 'select'].includes(param.type)) {
    errors.push('type is required and must be one of: number, string, select');
  }

  if (param.defaultValue === undefined || param.defaultValue === null) {
    errors.push('defaultValue is required');
  }

  if (param.type === 'select' && !Array.isArray(param.options)) {
    errors.push('options is required for select type parameters');
  }

  if (!param.nodeId || typeof param.nodeId !== 'string') {
    errors.push('nodeId is required and must be a string');
  }

  if (!param.fieldPath || typeof param.fieldPath !== 'string') {
    errors.push('fieldPath is required and must be a string');
  }

  // Type-specific validations
  if (param.type === 'number') {
    if (typeof param.defaultValue !== 'number') {
      errors.push('defaultValue must be a number for number type parameters');
    }
    if (param.min !== undefined && typeof param.min !== 'number') {
      errors.push('min must be a number');
    }
    if (param.max !== undefined && typeof param.max !== 'number') {
      errors.push('max must be a number');
    }
    if (param.step !== undefined && typeof param.step !== 'number') {
      errors.push('step must be a number');
    }
  }

  return errors;
}
