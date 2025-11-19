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
 * GET /api/projects/:id/story - 获取故事内容
 * Validates: Requirements 2.1
 */
router.get('/:id/story', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const story = await storyService.getStory(id);

    if (!story) {
      // Return empty story structure for new projects instead of 404
      return res.json({
        id: null,
        projectId: id,
        hook: '',
        middleStructure: '',
        ending: '',
        version: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    res.json(story);
  } catch (error: any) {
    console.error('Error getting story:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get story');
    }
  }
});

/**
 * PUT /api/projects/:id/story - 更新故事大纲
 * Validates: Requirements 2.2
 */
router.put('/:id/story', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hook, middleStructure, ending } = req.body;

    const story = await storyService.updateStory(id, {
      hook,
      middleStructure,
      ending,
    });

    res.json(story);
  } catch (error: any) {
    console.error('Error updating story:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update story');
    }
  }
});

/**
 * GET /api/projects/:id/story/versions - 获取故事版本历史
 */
router.get('/:id/story/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const versions = await storyService.getStoryVersions(id);

    res.json(versions);
  } catch (error: any) {
    console.error('Error getting story versions:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get story versions');
    }
  }
});

/**
 * POST /api/projects/:id/scenes - 创建场景
 * Validates: Requirements 2.3
 */
router.post('/:id/scenes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, estimatedDuration, voiceoverText, dialogueText, notes } = req.body;

    // Validate required fields
    if (!title) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Scene title is required');
    }

    const scene = await storyService.createScene(id, {
      title,
      description,
      estimatedDuration,
      voiceoverText,
      dialogueText,
      notes,
    });

    res.status(201).json(scene);
  } catch (error: any) {
    console.error('Error creating scene:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else if (error.message.includes('required') || error.message.includes('must be')) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create scene');
    }
  }
});

/**
 * GET /api/projects/:id/scenes - 获取项目的所有场景
 */
router.get('/:id/scenes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scenes = await storyService.getScenes(id);

    res.json(scenes);
  } catch (error: any) {
    console.error('Error getting scenes:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get scenes');
    }
  }
});

export default router;
