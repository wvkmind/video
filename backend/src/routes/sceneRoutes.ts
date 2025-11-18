import { Router, Request, Response } from 'express';
import { StoryService } from '../services/StoryService';

const router = Router();
const storyService = new StoryService();

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
 * GET /api/scenes/:id - 获取场景详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeShots = req.query.includeShots === 'true';

    const scene = includeShots
      ? await storyService.getSceneWithShots(id)
      : await storyService.getScene(id);

    res.json(scene);
  } catch (error: any) {
    console.error('Error getting scene:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SCENE_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get scene');
    }
  }
});

/**
 * PUT /api/scenes/:id - 更新场景
 * Validates: Requirements 2.3, 2.4
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, estimatedDuration, voiceoverText, dialogueText, notes } = req.body;

    const scene = await storyService.updateScene(id, {
      title,
      description,
      estimatedDuration,
      voiceoverText,
      dialogueText,
      notes,
    });

    res.json(scene);
  } catch (error: any) {
    console.error('Error updating scene:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SCENE_NOT_FOUND', error.message);
    } else if (error.message.includes('cannot be empty') || error.message.includes('must be')) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update scene');
    }
  }
});

/**
 * DELETE /api/scenes/:id - 删除场景
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await storyService.deleteScene(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting scene:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SCENE_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to delete scene');
    }
  }
});

/**
 * GET /api/scenes/:id/versions - 获取场景版本历史
 * Validates: Requirements 2.4
 */
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const versions = await storyService.getSceneVersions(id);

    res.json(versions);
  } catch (error: any) {
    console.error('Error getting scene versions:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SCENE_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get scene versions');
    }
  }
});

export default router;
