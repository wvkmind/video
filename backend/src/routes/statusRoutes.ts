import { Router, Request, Response, NextFunction } from 'express';
import { StatusService } from '../services/StatusService';
import { ErrorFactory } from '../middleware/errorHandler';

const router = Router();
const statusService = new StatusService();

/**
 * Update story status
 * PUT /api/stories/:id/status
 */
router.put('/stories/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw ErrorFactory.validationError('Status is required');
    }

    await statusService.updateStoryStatus(id, status);

    res.json({
      success: true,
      message: 'Story status updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update scene status
 * PUT /api/scenes/:id/status
 */
router.put('/scenes/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw ErrorFactory.validationError('Status is required');
    }

    await statusService.updateSceneStatus(id, status);

    res.json({
      success: true,
      message: 'Scene status updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update shot status
 * PUT /api/shots/:id/status
 */
router.put('/shots/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw ErrorFactory.validationError('Status is required');
    }

    await statusService.updateShotStatus(id, status);

    res.json({
      success: true,
      message: 'Shot status updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update project status
 * PUT /api/projects/:id/status
 */
router.put('/projects/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw ErrorFactory.validationError('Status is required');
    }

    await statusService.updateProjectStatus(id, status);

    res.json({
      success: true,
      message: 'Project status updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Batch update shot status
 * PUT /api/shots/batch-status
 */
router.put('/batch-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shotIds, status } = req.body;

    if (!shotIds || !Array.isArray(shotIds) || shotIds.length === 0) {
      throw ErrorFactory.validationError('Shot IDs array is required');
    }

    if (!status) {
      throw ErrorFactory.validationError('Status is required');
    }

    await statusService.batchUpdateShotStatus(shotIds, status);

    res.json({
      success: true,
      message: `Updated status for ${shotIds.length} shots`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get valid status transitions
 * GET /api/status/transitions/:entityType/:currentStatus
 */
router.get(
  '/transitions/:entityType/:currentStatus',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, currentStatus } = req.params;

      if (!['story', 'scene', 'shot', 'project'].includes(entityType)) {
        throw ErrorFactory.validationError(
          'Entity type must be one of: story, scene, shot, project'
        );
      }

      const validTransitions = statusService.getValidTransitions(
        entityType as 'story' | 'scene' | 'shot' | 'project',
        currentStatus as any
      );

      res.json({
        entityType,
        currentStatus,
        validTransitions,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
