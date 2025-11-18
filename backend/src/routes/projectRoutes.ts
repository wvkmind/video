import { Router, Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';

const router = Router();
const projectService = new ProjectService();

/**
 * Error response helper
 */
const sendError = (res: Response, statusCode: number, code: string, message: string) => {
  res.status(statusCode).json({
    error: {
      code,
      message,
    },
    timestamp: new Date().toISOString(),
    path: res.req.path,
  });
};

/**
 * GET /api/projects - 获取项目列表
 * Validates: Requirements 1.1, 1.2
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const status = req.query.status as any;
    const type = req.query.type as string;
    const searchTerm = req.query.search as string;

    const result = await projectService.listProjects({
      page,
      limit,
      status,
      type,
      searchTerm,
    });

    res.json(result);
  } catch (error) {
    console.error('Error listing projects:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to list projects');
  }
});

/**
 * POST /api/projects - 创建新项目
 * Validates: Requirements 1.3
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, targetDuration, targetStyle, targetAudience, notes } = req.body;

    // Validate required fields
    if (!name) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Project name is required');
    }

    if (!type) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Project type is required');
    }

    if (!targetDuration || targetDuration <= 0) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'Target duration must be a positive number'
      );
    }

    const project = await projectService.createProject({
      name,
      type,
      targetDuration,
      targetStyle,
      targetAudience,
      notes,
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    if (error.message.includes('required') || error.message.includes('must be')) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create project');
    }
  }
});

/**
 * GET /api/projects/:id - 获取项目详情
 * Validates: Requirements 1.1
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeRelations = req.query.includeRelations === 'true';

    const project = includeRelations
      ? await projectService.getProjectWithRelations(id)
      : await projectService.getProject(id);

    res.json(project);
  } catch (error: any) {
    console.error('Error getting project:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get project');
    }
  }
});

/**
 * PUT /api/projects/:id - 更新项目
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, targetDuration, targetStyle, targetAudience, notes, status } = req.body;

    const project = await projectService.updateProject(id, {
      name,
      type,
      targetDuration,
      targetStyle,
      targetAudience,
      notes,
      status,
    });

    res.json(project);
  } catch (error: any) {
    console.error('Error updating project:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else if (error.message.includes('cannot be empty') || error.message.includes('must be')) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update project');
    }
  }
});

/**
 * POST /api/projects/:id/duplicate - 复制项目
 * Validates: Requirements 1.4
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const newProject = await projectService.duplicateProject(id);

    res.status(201).json(newProject);
  } catch (error: any) {
    console.error('Error duplicating project:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to duplicate project');
    }
  }
});

/**
 * DELETE /api/projects/:id - 删除项目
 * Validates: Requirements 1.5
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await projectService.deleteProject(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting project:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to delete project');
    }
  }
});

/**
 * POST /api/projects/:id/archive - 归档项目
 * Validates: Requirements 1.5
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await projectService.archiveProject(id);

    res.json(project);
  } catch (error: any) {
    console.error('Error archiving project:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to archive project');
    }
  }
});

export default router;
