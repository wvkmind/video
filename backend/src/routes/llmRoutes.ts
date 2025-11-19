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

/**
 * POST /api/projects/:id/generate-scenes - 生成场景列表
 * Validates: Requirements 2.5
 */
router.post('/:id/generate-scenes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get story outline
    const story = await storyService.getStory(id);
    if (!story) {
      return sendError(res, 404, 'STORY_NOT_FOUND', `Story for project ${id} not found`);
    }

    if (!story.hook && !story.middleStructure && !story.ending) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Story outline is empty. Please generate or write a story outline first.');
    }

    // Generate scenes using LLM
    const generatedScenes = await llmService.generateScenes({
      hook: story.hook || '',
      middleStructure: story.middleStructure || '',
      ending: story.ending || '',
    });

    // Create scenes in database
    const createdScenes = [];
    for (const sceneData of generatedScenes) {
      const scene = await storyService.createScene(id, {
        title: sceneData.title,
        description: sceneData.description,
        estimatedDuration: sceneData.estimatedDuration,
      });
      createdScenes.push(scene);
    }

    res.json({
      scenes: createdScenes,
      count: createdScenes.length,
    });
  } catch (error: any) {
    console.error('Error generating scenes:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'STORY_NOT_FOUND', error.message);
    } else if (error.message.includes('API key') || error.message.includes('POE_API_KEY')) {
      sendError(res, 503, 'LLM_SERVICE_UNAVAILABLE', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to generate scenes');
    }
  }
});

/**
 * POST /api/scenes/:id/generate-shots - 生成分镜列表
 * Validates: Requirements 2.5
 */
router.post('/scenes/:id/generate-shots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get scene details
    const scene = await storyService.getScene(id);
    if (!scene) {
      return sendError(res, 404, 'SCENE_NOT_FOUND', `Scene ${id} not found`);
    }

    // Generate shots using LLM
    const generatedShots = await llmService.generateShots(
      scene.title,
      scene.description || '',
      scene.voiceoverText
    );

    // Get existing shots for this scene to determine next shot number
    const existingShots = await shotService.listShots(scene.projectId);
    const sceneShots = existingShots.filter(s => s.sceneId === id);
    let nextShotNumber = sceneShots.length + 1;

    console.log(`Creating ${generatedShots.length} shots for scene ${scene.sceneNumber} (${id})`);
    console.log(`Existing shots in scene: ${sceneShots.length}, next shot number: ${nextShotNumber}`);

    // Create shots in database
    const createdShots = [];
    for (let i = 0; i < generatedShots.length; i++) {
      const shotData = generatedShots[i];
      const shotId = `S${scene.sceneNumber}-${nextShotNumber + i}`;
      
      console.log(`Creating shot ${shotId}:`, {
        title: shotData.title,
        duration: shotData.duration,
      });
      
      // Combine title and description for the description field
      const fullDescription = shotData.title 
        ? `${shotData.title}: ${shotData.description || ''}`
        : shotData.description;
      
      const shot = await shotService.createShot(scene.projectId, {
        sceneId: id,
        shotId: shotId,
        description: fullDescription,
        duration: shotData.duration,
        shotType: 'medium', // Default shot type
        environment: shotData.environment,
        subject: shotData.subject,
        action: shotData.action,
        cameraMovement: shotData.cameraMovement,
        lighting: shotData.lighting,
        style: shotData.style,
      });
      
      console.log(`Successfully created shot ${shot.id} with shotId ${shot.shotId}`);
      createdShots.push(shot);
    }

    console.log(`Total shots created: ${createdShots.length}`);

    res.json({
      shots: createdShots,
      count: createdShots.length,
    });
  } catch (error: any) {
    console.error('Error generating shots:', error);
    if (error.message.includes('not found')) {
      sendError(res, 404, 'SCENE_NOT_FOUND', error.message);
    } else if (error.message.includes('API key') || error.message.includes('POE_API_KEY')) {
      sendError(res, 503, 'LLM_SERVICE_UNAVAILABLE', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to generate shots');
    }
  }
});

export default router;
