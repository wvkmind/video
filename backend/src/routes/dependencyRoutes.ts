import { Router, Request, Response } from 'express';
import { DependencyService } from '../services/DependencyService';

const router = Router();
const dependencyService = new DependencyService();

/**
 * GET /api/dependencies/:entityType/:entityId/impact
 * Check the downstream impact of modifying an entity
 */
router.get('/:entityType/:entityId/impact', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    // Validate entity type
    const validTypes = ['story', 'scene', 'shot', 'keyframe'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ENTITY_TYPE',
          message: `Entity type must be one of: ${validTypes.join(', ')}`
        }
      });
    }

    const impact = await dependencyService.checkDownstreamImpact(
      entityType as 'story' | 'scene' | 'shot' | 'keyframe',
      entityId
    );

    res.json(impact);
  } catch (error: any) {
    console.error('Error checking downstream impact:', error);
    res.status(500).json({
      error: {
        code: 'IMPACT_CHECK_FAILED',
        message: 'Failed to check downstream impact',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/dependencies/:entityType/:entityId/dependents
 * Get direct dependents of an entity
 */
router.get('/:entityType/:entityId/dependents', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    // Validate entity type
    const validTypes = ['story', 'scene', 'shot', 'keyframe'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ENTITY_TYPE',
          message: `Entity type must be one of: ${validTypes.join(', ')}`
        }
      });
    }

    const dependents = await dependencyService.getDependentEntities(
      entityType as 'story' | 'scene' | 'shot' | 'keyframe',
      entityId
    );

    res.json({ dependents });
  } catch (error: any) {
    console.error('Error getting dependents:', error);
    res.status(500).json({
      error: {
        code: 'GET_DEPENDENTS_FAILED',
        message: 'Failed to get dependent entities',
        details: error.message
      }
    });
  }
});

export default router;
