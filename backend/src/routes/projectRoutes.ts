import { Router, Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';
import { asyncHandler } from '../middleware/errorHandler';
import { RequestValidator, ResponseHelper, ErrorHelper } from '../utils/errorUtils';

const router = Router();
const projectService = new ProjectService();

/**
 * GET /api/projects - 获取项目列表
 * Validates: Requirements 1.1, 1.2
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
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

  ResponseHelper.success(res, result);
}));

/**
 * POST /api/projects - 创建新项目
 * Validates: Requirements 1.3
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, type, targetDuration, targetStyle, targetAudience, notes } = req.body;

  // Validate required fields
  RequestValidator.requireFields(req.body, ['name', 'type', 'targetDuration']);
  RequestValidator.validatePositive(targetDuration, 'targetDuration');

  const project = await projectService.createProject({
    name,
    type,
    targetDuration,
    targetStyle,
    targetAudience,
    notes,
  });

  ResponseHelper.created(res, project, 'Project created successfully');
}));

/**
 * GET /api/projects/:id - 获取项目详情
 * Validates: Requirements 1.1
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeRelations = req.query.includeRelations === 'true';

  const project = includeRelations
    ? await projectService.getProjectWithRelations(id)
    : await projectService.getProject(id);

  ErrorHelper.assertExists(project, 'Project', id);

  ResponseHelper.success(res, project);
}));

/**
 * PUT /api/projects/:id - 更新项目
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, targetDuration, targetStyle, targetAudience, notes, status } = req.body;

  if (targetDuration !== undefined) {
    RequestValidator.validatePositive(targetDuration, 'targetDuration');
  }

  const project = await projectService.updateProject(id, {
    name,
    type,
    targetDuration,
    targetStyle,
    targetAudience,
    notes,
    status,
  });

  ErrorHelper.assertExists(project, 'Project', id);

  ResponseHelper.success(res, project, 'Project updated successfully');
}));

/**
 * POST /api/projects/:id/duplicate - 复制项目
 * Validates: Requirements 1.4
 */
router.post('/:id/duplicate', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const newProject = await projectService.duplicateProject(id);

  ErrorHelper.assertExists(newProject, 'Project');

  ResponseHelper.created(res, newProject, 'Project duplicated successfully');
}));

/**
 * DELETE /api/projects/:id - 删除项目
 * Validates: Requirements 1.5
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await projectService.deleteProject(id);

  ResponseHelper.noContent(res);
}));

/**
 * POST /api/projects/:id/archive - 归档项目
 * Validates: Requirements 1.5
 */
router.post('/:id/archive', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = await projectService.archiveProject(id);

  ErrorHelper.assertExists(project, 'Project', id);

  ResponseHelper.success(res, project, 'Project archived successfully');
}));

export default router;
