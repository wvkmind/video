import { Router, Request, Response } from 'express';
import { WorkflowConfigService } from '../services/WorkflowConfigService';

const router = Router();
const workflowService = new WorkflowConfigService();

/**
 * GET /api/workflows
 * Get list of all active workflows, optionally filtered by type
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const workflows = await workflowService.listWorkflows(
      type as string | undefined
    );

    res.json({
      success: true,
      data: workflows,
      count: workflows.length,
    });
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_LIST_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to list workflows',
      },
    });
  }
});

/**
 * GET /api/workflows/:name
 * Get workflow details by name
 */
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const workflow = await workflowService.getWorkflow(name);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: `Workflow '${name}' not found`,
        },
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error('Error getting workflow:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_GET_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to get workflow',
      },
    });
  }
});

/**
 * POST /api/workflows/reload
 * Reload workflow configurations from files
 */
router.post('/reload', async (req: Request, res: Response) => {
  try {
    const result = await workflowService.loadConfigs();

    res.json({
      success: true,
      data: result,
      message: `Loaded ${result.loaded} workflows, ${result.failed} failed`,
    });
  } catch (error) {
    console.error('Error reloading workflows:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_RELOAD_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to reload workflows',
      },
    });
  }
});

/**
 * POST /api/workflows
 * Create a new workflow configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const workflow = await workflowService.createWorkflow(config);

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully',
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'WORKFLOW_CREATE_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to create workflow',
      },
    });
  }
});

/**
 * PUT /api/workflows/:id
 * Update an existing workflow configuration
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = req.body;
    const workflow = await workflowService.updateWorkflow(id, config);

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow updated successfully',
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        code: 'WORKFLOW_UPDATE_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to update workflow',
      },
    });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow configuration
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await workflowService.deleteWorkflow(id);

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: 'WORKFLOW_DELETE_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to delete workflow',
      },
    });
  }
});

/**
 * PATCH /api/workflows/:id/active
 * Activate or deactivate a workflow
 */
router.patch('/:id/active', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'isActive must be a boolean',
        },
      });
    }

    const workflow = await workflowService.setWorkflowActive(id, isActive);

    res.json({
      success: true,
      data: workflow,
      message: `Workflow ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error updating workflow status:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: 'WORKFLOW_STATUS_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update workflow status',
      },
    });
  }
});

export default router;
