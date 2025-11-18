import { Router, Request, Response } from 'express';
import { ShotService } from '../services/ShotService';

const router = Router();
const shotService = new ShotService();

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
 * GET /api/projects/:id/shots - 获取镜头列表
 * Validates: Requirements 3.1
 */
router.get('/:id/shots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const shots = await shotService.listShots(id);

    res.json(shots);
  } catch (error: any) {
    console.error('Error listing shots:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to list shots');
    }
  }
});

/**
 * POST /api/projects/:id/shots - 创建镜头
 * Validates: Requirements 3.2
 */
router.post('/:id/shots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      sceneId,
      shotId,
      duration,
      shotType,
      description,
      environment,
      subject,
      action,
      cameraMovement,
      lighting,
      style,
      previousShotId,
      nextShotId,
      transitionType,
      useLastFrameAsFirst,
      relatedVoiceover,
      importance,
    } = req.body;

    // Validate required fields
    if (!sceneId) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Scene ID is required');
    }

    if (!shotId) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Shot ID is required');
    }

    if (!duration || duration <= 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Duration must be a positive number');
    }

    if (!shotType) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Shot type is required');
    }

    const shot = await shotService.createShot(id, {
      sceneId,
      shotId,
      duration,
      shotType,
      description,
      environment,
      subject,
      action,
      cameraMovement,
      lighting,
      style,
      previousShotId,
      nextShotId,
      transitionType,
      useLastFrameAsFirst,
      relatedVoiceover,
      importance,
    });

    res.status(201).json(shot);
  } catch (error: any) {
    console.error('Error creating shot:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'RESOURCE_NOT_FOUND', error.message);
    } else if (
      error.message.includes('required') ||
      error.message.includes('must be') ||
      error.message.includes('already exists')
    ) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create shot');
    }
  }
});

/**
 * GET /api/projects/:id/shots/export - 导出分镜表
 * Validates: Requirements 3.6
 */
router.get('/:id/shots/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as 'json' | 'csv') || 'json';

    if (format !== 'json' && format !== 'csv') {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Format must be either "json" or "csv"');
    }

    const storyboard = await shotService.exportStoryboard(id, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="storyboard-${id}.csv"`);
      res.send(storyboard);
    } else {
      res.json(storyboard);
    }
  } catch (error: any) {
    console.error('Error exporting storyboard:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to export storyboard');
    }
  }
});

/**
 * GET /api/shots/:id - 获取镜头详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeRelations = req.query.includeRelations === 'true';

    const shot = includeRelations
      ? await shotService.getShotWithRelations(id)
      : await shotService.getShot(id);

    res.json(shot);
  } catch (error: any) {
    console.error('Error getting shot:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SHOT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get shot');
    }
  }
});

/**
 * PUT /api/shots/:id - 更新镜头
 * Validates: Requirements 3.2
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      shotId,
      sceneId,
      duration,
      shotType,
      description,
      environment,
      subject,
      action,
      cameraMovement,
      lighting,
      style,
      previousShotId,
      nextShotId,
      transitionType,
      useLastFrameAsFirst,
      relatedVoiceover,
      importance,
    } = req.body;

    const shot = await shotService.updateShot(id, {
      shotId,
      sceneId,
      duration,
      shotType,
      description,
      environment,
      subject,
      action,
      cameraMovement,
      lighting,
      style,
      previousShotId,
      nextShotId,
      transitionType,
      useLastFrameAsFirst,
      relatedVoiceover,
      importance,
    });

    res.json(shot);
  } catch (error: any) {
    console.error('Error updating shot:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SHOT_NOT_FOUND', error.message);
    } else if (
      error.message.includes('cannot be empty') ||
      error.message.includes('must be') ||
      error.message.includes('already exists')
    ) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update shot');
    }
  }
});

/**
 * DELETE /api/shots/:id - 删除镜头
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await shotService.deleteShot(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting shot:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SHOT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to delete shot');
    }
  }
});

/**
 * PUT /api/shots/reorder - 批量更新顺序
 * Validates: Requirements 3.3
 */
router.put('/reorder', async (req: Request, res: Response) => {
  try {
    const { shotIds } = req.body;

    if (!shotIds || !Array.isArray(shotIds) || shotIds.length === 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'shotIds must be a non-empty array');
    }

    const shots = await shotService.reorderShots(shotIds);

    res.json(shots);
  } catch (error: any) {
    console.error('Error reordering shots:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SHOT_NOT_FOUND', error.message);
    } else if (error.message.includes('cannot be empty') || error.message.includes('must belong')) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to reorder shots');
    }
  }
});

/**
 * PUT /api/shots/batch-style - 批量设置风格
 * Validates: Requirements 3.5
 */
router.put('/batch-style', async (req: Request, res: Response) => {
  try {
    const { shotIds, style, lighting, cameraMovement } = req.body;

    if (!shotIds || !Array.isArray(shotIds) || shotIds.length === 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'shotIds must be a non-empty array');
    }

    const shots = await shotService.batchUpdateStyle(shotIds, {
      style,
      lighting,
      cameraMovement,
    });

    res.json(shots);
  } catch (error: any) {
    console.error('Error batch updating style:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SHOT_NOT_FOUND', error.message);
    } else if (error.message.includes('cannot be empty')) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to batch update style');
    }
  }
});

/**
 * PUT /api/shots/:id/transition - 设置衔接关系
 * Validates: Requirements 3.4
 */
router.put('/:id/transition', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { previousShotId, nextShotId, transitionType, useLastFrameAsFirst } = req.body;

    if (!transitionType) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Transition type is required');
    }

    if (useLastFrameAsFirst === undefined) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'useLastFrameAsFirst is required');
    }

    const shot = await shotService.setTransitionRelationship(id, {
      previousShotId,
      nextShotId,
      transitionType,
      useLastFrameAsFirst,
    });

    res.json(shot);
  } catch (error: any) {
    console.error('Error setting transition relationship:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SHOT_NOT_FOUND', error.message);
    } else if (error.message.includes('must belong')) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to set transition relationship');
    }
  }
});

export default router;
