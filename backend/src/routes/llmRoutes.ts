import { Router, Request, Response } from 'express';
import { LLMService } from '../services/LLMService';
import { StoryService } from '../services/StoryService';
import { ShotService } from '../services/ShotService';

const router = Router();
const llmService = new LLMService();
const storyService = new StoryService();
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
 * POST /api/projects/:id/generate-story-outline - 生成故事大纲
 * Validates: Requirements 2.5
 */
router.post('/:id/generate-story-outline', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectDescription } = req.body;

    if (!projectDescription) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Project description is required');
    }

    // Generate story outline using LLM
    const outline = await llmService.generateStoryOutline(projectDescription);

    // Update the story with generated outline
    const story = await storyService.updateStory(id, outline);

    res.json({
      story,
      generated: outline,
    });
  } catch (error: any) {
    console.error('Error generating story outline:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'PROJECT_NOT_FOUND', error.message);
    } else if (error.message.includes('API key') || error.message.includes('POE_API_KEY')) {
      sendError(res, 503, 'LLM_SERVICE_UNAVAILABLE', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to generate story outline');
    }
  }
});

/**
 * POST /api/scenes/:id/generate-script - 生成场景脚本
 * Validates: Requirements 2.5
 */
router.post('/scenes/:id/generate-script', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get scene details
    const scene = await storyService.getScene(id);
    if (!scene) {
      return sendError(res, 404, 'SCENE_NOT_FOUND', `Scene ${id} not found`);
    }

    // Get story outline for context
    const story = await storyService.getStory(scene.projectId);
    if (!story) {
      return sendError(res, 404, 'STORY_NOT_FOUND', `Story for project ${scene.projectId} not found`);
    }

    // Generate script using LLM
    const sceneDescription = `${scene.title}: ${scene.description || ''}`;
    const script = await llmService.generateSceneScript(sceneDescription, {
      hook: story.hook || '',
      middleStructure: story.middleStructure || '',
      ending: story.ending || '',
    });

    // Update scene with generated script
    const updatedScene = await storyService.updateScene(id, {
      voiceoverText: script,
    });

    res.json({
      scene: updatedScene,
      generatedScript: script,
    });
  } catch (error: any) {
    console.error('Error generating scene script:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SCENE_NOT_FOUND', error.message);
    } else if (error.message.includes('API key') || error.message.includes('POE_API_KEY')) {
      sendError(res, 503, 'LLM_SERVICE_UNAVAILABLE', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to generate scene script');
    }
  }
});

/**
 * POST /api/shots/:id/optimize-prompt - 优化 Prompt
 * Validates: Requirements 2.5
 */
router.post('/shots/:id/optimize-prompt', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get shot details
    const shot = await shotService.getShot(id);
    if (!shot) {
      return sendError(res, 404, 'SHOT_NOT_FOUND', `Shot ${id} not found`);
    }

    // Optimize prompt using LLM
    const optimizedPrompt = await llmService.optimizePrompt({
      environment: shot.environment,
      subject: shot.subject,
      action: shot.action,
      cameraMovement: shot.cameraMovement,
      lighting: shot.lighting,
      style: shot.style,
    });

    res.json({
      shotId: id,
      originalDescription: {
        environment: shot.environment,
        subject: shot.subject,
        action: shot.action,
        cameraMovement: shot.cameraMovement,
        lighting: shot.lighting,
        style: shot.style,
      },
      optimizedPrompt,
    });
  } catch (error: any) {
    console.error('Error optimizing prompt:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SHOT_NOT_FOUND', error.message);
    } else if (error.message.includes('API key') || error.message.includes('POE_API_KEY')) {
      sendError(res, 503, 'LLM_SERVICE_UNAVAILABLE', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to optimize prompt');
    }
  }
});

/**
 * POST /api/scenes/:id/compress-voiceover - 压缩旁白
 * Validates: Requirements 2.5
 */
router.post('/scenes/:id/compress-voiceover', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetDuration } = req.body;

    if (!targetDuration || targetDuration <= 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid target duration is required');
    }

    // Get scene details
    const scene = await storyService.getScene(id);
    if (!scene) {
      return sendError(res, 404, 'SCENE_NOT_FOUND', `Scene ${id} not found`);
    }

    if (!scene.voiceoverText) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Scene has no voiceover text to compress');
    }

    // Compress voiceover using LLM
    const compressedText = await llmService.compressVoiceover(
      scene.voiceoverText,
      targetDuration
    );

    // Update scene with compressed text
    const updatedScene = await storyService.updateScene(id, {
      voiceoverText: compressedText,
    });

    res.json({
      scene: updatedScene,
      originalText: scene.voiceoverText,
      compressedText,
      originalWords: scene.voiceoverText.split(/\s+/).length,
      compressedWords: compressedText.split(/\s+/).length,
      targetDuration,
    });
  } catch (error: any) {
    console.error('Error compressing voiceover:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SCENE_NOT_FOUND', error.message);
    } else if (error.message.includes('API key') || error.message.includes('POE_API_KEY')) {
      sendError(res, 503, 'LLM_SERVICE_UNAVAILABLE', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to compress voiceover');
    }
  }
});

export default router;
