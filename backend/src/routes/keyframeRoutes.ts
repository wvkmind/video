import { Router, Request, Response } from 'express';
import { KeyframeService } from '../services/KeyframeService';

const router = Router();
const keyframeService = new KeyframeService();

/**
 * GET /api/shots/:id/keyframes
 * Get all keyframes for a shot
 * Requirement 4.1: Display keyframe preview grid
 */
router.get('/:id/keyframes', async (req: Request, res: Response) => {
  try {
    const { id: shotId } = req.params;
    const keyframes = await keyframeService.listKeyframes(shotId);
    res.json(keyframes);
  } catch (error) {
    console.error('Error fetching keyframes:', error);
    res.status(500).json({
      error: {
        code: 'KEYFRAMES_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch keyframes',
      },
    });
  }
});

/**
 * GET /api/shots/:id/prompt
 * Get auto-generated prompt for a shot
 * Requirement 4.2: Auto-generate English prompt from shot fields
 */
router.get('/:id/prompt', async (req: Request, res: Response) => {
  try {
    const { id: shotId } = req.params;
    const prompt = await keyframeService.generatePrompt(shotId);
    res.json({ prompt });
  } catch (error) {
    console.error('Error generating prompt:', error);
    res.status(500).json({
      error: {
        code: 'PROMPT_GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate prompt',
      },
    });
  }
});

/**
 * POST /api/shots/:id/generate-keyframes
 * Generate keyframes for a shot
 * Requirement 4.4: Generate 4 candidate keyframe images
 */
router.post('/:id/generate-keyframes', async (req: Request, res: Response) => {
  try {
    const { id: shotId } = req.params;
    const params = req.body;

    // Validate required parameters
    if (!params.workflowName) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'workflowName is required',
        },
      });
    }

    const keyframes = await keyframeService.generateKeyframes(shotId, params);
    res.status(201).json(keyframes);
  } catch (error) {
    console.error('Error generating keyframes:', error);
    res.status(500).json({
      error: {
        code: 'KEYFRAME_GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate keyframes',
      },
    });
  }
});

/**
 * PUT /api/keyframes/:id/select
 * Select a keyframe as the current one
 * Requirement 4.5: Mark selected keyframe
 */
router.put('/:id/select', async (req: Request, res: Response) => {
  try {
    const { id: keyframeId } = req.params;
    const keyframe = await keyframeService.selectKeyframe(keyframeId);
    res.json(keyframe);
  } catch (error) {
    console.error('Error selecting keyframe:', error);
    res.status(500).json({
      error: {
        code: 'KEYFRAME_SELECT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to select keyframe',
      },
    });
  }
});

/**
 * GET /api/keyframes/:id/status
 * Get keyframe generation status
 * Requirement 4.4: Query generation status
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id: keyframeId } = req.params;
    const status = await keyframeService.getKeyframeStatus(keyframeId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching keyframe status:', error);
    res.status(500).json({
      error: {
        code: 'KEYFRAME_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch keyframe status',
      },
    });
  }
});

/**
 * GET /api/keyframes/:id
 * Get a single keyframe by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id: keyframeId } = req.params;
    const keyframe = await keyframeService.getKeyframe(keyframeId);
    
    if (!keyframe) {
      return res.status(404).json({
        error: {
          code: 'KEYFRAME_NOT_FOUND',
          message: `Keyframe not found: ${keyframeId}`,
        },
      });
    }
    
    res.json(keyframe);
  } catch (error) {
    console.error('Error fetching keyframe:', error);
    res.status(500).json({
      error: {
        code: 'KEYFRAME_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch keyframe',
      },
    });
  }
});

export default router;
