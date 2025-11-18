import { Router, Request, Response } from 'express';
import { ClipService } from '../services/ClipService';

const router = Router();
const clipService = new ClipService();

/**
 * GET /api/shots/:id/clips
 * Get all clips for a shot
 */
router.get('/shots/:id/clips', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clips = await clipService.listClips(id);
    res.json(clips);
  } catch (error: any) {
    console.error('Error fetching clips:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/shots/:id/generate-clip
 * Generate a new video clip
 */
router.post('/shots/:id/generate-clip', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      inputMode,
      keyframeId,
      prompt,
      workflowName,
      duration,
      fps,
      width,
      height,
      steps,
      guidance,
      cfg,
      seed,
      useLastFrameReference,
      referenceClipId,
      mode,
    } = req.body;

    // Validate required fields
    if (!inputMode || !workflowName) {
      return res.status(400).json({
        error: 'inputMode and workflowName are required',
      });
    }

    const clip = await clipService.generateClip({
      shotId: id,
      inputMode,
      keyframeId,
      prompt,
      workflowName,
      duration,
      fps,
      width,
      height,
      steps,
      guidance,
      cfg,
      seed,
      useLastFrameReference,
      referenceClipId,
      mode,
    });

    res.status(201).json(clip);
  } catch (error: any) {
    console.error('Error generating clip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/clips/:id/status
 * Get clip generation status
 */
router.get('/clips/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = await clipService.getClipStatus(id);
    res.json(status);
  } catch (error: any) {
    console.error('Error fetching clip status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/clips/:id/select
 * Select a clip as the active version
 */
router.put('/clips/:id/select', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clip = await clipService.selectClip(id);

    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    res.json(clip);
  } catch (error: any) {
    console.error('Error selecting clip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/clips/:id/extract-frame
 * Extract a specific frame from a clip
 */
router.post('/clips/:id/extract-frame', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { frameNumber } = req.body;

    if (frameNumber === undefined) {
      return res.status(400).json({ error: 'frameNumber is required' });
    }

    const framePath = await clipService.extractFrame(id, frameNumber);
    res.json({ framePath });
  } catch (error: any) {
    console.error('Error extracting frame:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/clips/detect-mismatch
 * Detect frame mismatch between two clips
 * Validates: Requirements 9.5
 */
router.post('/clips/detect-mismatch', async (req: Request, res: Response) => {
  try {
    const { clip1Id, clip2Id } = req.body;

    if (!clip1Id || !clip2Id) {
      return res.status(400).json({ error: 'clip1Id and clip2Id are required' });
    }

    const result = await clipService.detectFrameMismatch(clip1Id, clip2Id);
    res.json(result);
  } catch (error: any) {
    console.error('Error detecting frame mismatch:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
