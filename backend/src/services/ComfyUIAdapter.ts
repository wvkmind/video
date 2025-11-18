import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { WorkflowConfig, WorkflowParameter } from '../entities/WorkflowConfig';
import { config } from '../config/env';

interface ComfyUIPromptRequest {
  prompt: Record<string, any>;
  client_id?: string;
}

interface ComfyUIPromptResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, any>;
}

interface ComfyUIHistoryResponse {
  [promptId: string]: {
    prompt: any[];
    outputs: Record<string, {
      images?: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
      videos?: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
    }>;
    status: {
      status_str: string;
      completed: boolean;
      messages?: string[];
    };
  };
}

export interface WorkflowOverrides {
  [nodeId: string]: {
    [fieldPath: string]: any;
  };
}

export interface GenerationParams {
  workflowName: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  resolution?: { width: number; height: number };
  referenceImage?: string;
  keyframeImage?: string;
  firstFrameReference?: string;
  firstFrameStrength?: number;
  duration?: number;
  fps?: number;
  numFrames?: number;
  [key: string]: any;
}

export class ComfyUIAdapter {
  private workflowRepository: Repository<WorkflowConfig>;
  private baseUrl: string;
  private timeout: number;
  private workflowCache: Map<string, WorkflowConfig> = new Map();

  constructor() {
    this.workflowRepository = AppDataSource.getRepository(WorkflowConfig);
    this.baseUrl = config.comfyui.baseUrl;
    this.timeout = config.comfyui.timeout * 1000; // Convert to milliseconds
  }

  /**
   * Load workflows from database and cache them
   * Requirements: 7.1
   */
  async loadWorkflows(): Promise<WorkflowConfig[]> {
    try {
      const workflows = await this.workflowRepository.find({
        where: { isActive: true },
      });

      // Update cache
      this.workflowCache.clear();
      workflows.forEach((workflow) => {
        this.workflowCache.set(workflow.name, workflow);
      });

      return workflows;
    } catch (error) {
      throw new Error(`Failed to load workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific workflow by name
   */
  async getWorkflow(workflowName: string): Promise<WorkflowConfig> {
    // Check cache first
    if (this.workflowCache.has(workflowName)) {
      return this.workflowCache.get(workflowName)!;
    }

    // Load from database
    const workflow = await this.workflowRepository.findOne({
      where: { name: workflowName, isActive: true },
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    // Update cache
    this.workflowCache.set(workflowName, workflow);
    return workflow;
  }

  /**
   * Build ComfyUI workflow JSON with parameter overrides
   * Requirements: 7.2
   */
  async buildWorkflowJSON(
    workflowName: string,
    params: GenerationParams
  ): Promise<Record<string, any>> {
    const workflow = await this.getWorkflow(workflowName);
    
    // Deep clone the workflow JSON to avoid modifying the original
    const workflowJSON = JSON.parse(JSON.stringify(workflow.workflowJSON));

    // Apply parameter overrides based on workflow configuration
    for (const param of workflow.parameters) {
      const value = params[param.name];
      
      if (value !== undefined) {
        this.applyParameterOverride(workflowJSON, param, value);
      } else if (param.defaultValue !== undefined) {
        this.applyParameterOverride(workflowJSON, param, param.defaultValue);
      }
    }

    return workflowJSON;
  }

  /**
   * Apply a parameter override to the workflow JSON
   */
  private applyParameterOverride(
    workflowJSON: Record<string, any>,
    param: WorkflowParameter,
    value: any
  ): void {
    const { nodeId, fieldPath } = param;

    if (!workflowJSON[nodeId]) {
      throw new Error(`Node not found in workflow: ${nodeId}`);
    }

    // Parse field path (e.g., "inputs.steps" -> ["inputs", "steps"])
    const pathParts = fieldPath.split('.');
    let current = workflowJSON[nodeId];

    // Navigate to the parent of the target field
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the value
    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = value;
  }

  /**
   * Submit a generation task to ComfyUI
   * Requirements: 7.3
   */
  async submitPrompt(
    workflowName: string,
    params: GenerationParams
  ): Promise<string> {
    try {
      const workflowJSON = await this.buildWorkflowJSON(workflowName, params);

      const requestBody: ComfyUIPromptRequest = {
        prompt: workflowJSON,
        client_id: this.generateClientId(),
      };

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/prompt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        this.timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as ComfyUIPromptResponse;

      if (result.node_errors && Object.keys(result.node_errors).length > 0) {
        throw new Error(`ComfyUI node errors: ${JSON.stringify(result.node_errors)}`);
      }

      return result.prompt_id;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to submit prompt: ${error.message}`);
      }
      throw new Error('Failed to submit prompt: Unknown error');
    }
  }

  /**
   * Get task status from ComfyUI
   * Requirements: 7.4
   */
  async getTaskStatus(taskId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    error?: string;
  }> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/history/${taskId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.timeout
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { status: 'pending' };
        }
        throw new Error(`ComfyUI API error: ${response.status}`);
      }

      const history = await response.json() as ComfyUIHistoryResponse;

      if (!history[taskId]) {
        return { status: 'pending' };
      }

      const taskData = history[taskId];
      const statusStr = taskData.status?.status_str || '';

      if (statusStr === 'success' || taskData.status?.completed) {
        return { status: 'completed' };
      } else if (statusStr === 'error') {
        return {
          status: 'failed',
          error: taskData.status?.messages?.join(', ') || 'Unknown error',
        };
      } else {
        return { status: 'processing' };
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get task status: ${error.message}`);
      }
      throw new Error('Failed to get task status: Unknown error');
    }
  }

  /**
   * Get task result from ComfyUI
   * Requirements: 7.5
   */
  async getTaskResult(taskId: string): Promise<{
    images?: string[];
    videos?: string[];
  }> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/history/${taskId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        this.timeout
      );

      if (!response.ok) {
        throw new Error(`ComfyUI API error: ${response.status}`);
      }

      const history = await response.json() as ComfyUIHistoryResponse;

      if (!history[taskId]) {
        throw new Error('Task not found in history');
      }

      const taskData = history[taskId];
      const outputs = taskData.outputs || {};

      const result: { images?: string[]; videos?: string[] } = {};

      // Extract image paths
      const images: string[] = [];
      const videos: string[] = [];

      for (const nodeId in outputs) {
        const nodeOutput = outputs[nodeId];

        if (nodeOutput.images) {
          for (const img of nodeOutput.images) {
            const path = this.buildOutputPath(img.filename, img.subfolder, img.type);
            images.push(path);
          }
        }

        if (nodeOutput.videos) {
          for (const vid of nodeOutput.videos) {
            const path = this.buildOutputPath(vid.filename, vid.subfolder, vid.type);
            videos.push(path);
          }
        }
      }

      if (images.length > 0) {
        result.images = images;
      }

      if (videos.length > 0) {
        result.videos = videos;
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get task result: ${error.message}`);
      }
      throw new Error('Failed to get task result: Unknown error');
    }
  }

  /**
   * Submit a task and wait for completion with retry logic
   */
  async submitAndWait(
    workflowName: string,
    params: GenerationParams,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      pollInterval?: number;
    } = {}
  ): Promise<{ images?: string[]; videos?: string[] }> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    const pollInterval = options.pollInterval || 2000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Submit the task
        const taskId = await this.submitPrompt(workflowName, params);

        // Poll for completion
        while (true) {
          await this.sleep(pollInterval);

          const status = await this.getTaskStatus(taskId);

          if (status.status === 'completed') {
            return await this.getTaskResult(taskId);
          } else if (status.status === 'failed') {
            throw new Error(`Task failed: ${status.error || 'Unknown error'}`);
          }
          // Continue polling if pending or processing
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on certain errors
        if (
          lastError.message.includes('Workflow not found') ||
          lastError.message.includes('Node not found')
        ) {
          throw lastError;
        }

        // Wait before retrying
        if (attempt < maxRetries - 1) {
          await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw new Error(
      `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Helper: Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Helper: Generate a unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Helper: Build output file path
   */
  private buildOutputPath(filename: string, subfolder: string, type: string): string {
    if (subfolder) {
      return `${type}/${subfolder}/${filename}`;
    }
    return `${type}/${filename}`;
  }

  /**
   * Helper: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
