import { Router } from 'express';
import { batchRefreshService } from '../services/BatchRefreshService';

const router = Router();

/**
 * POST /api/projects/:projectId/batch-refresh/story
 * 批量刷新故事的下游产物
 */
router.post('/projects/:projectId/batch-refresh/story', async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await batchRefreshService.refreshStoryDownstream(projectId);

    res.json({
      success: true,
      ...result,
      message: `批量刷新完成：${result.summary.completed}/${result.summary.total} 成功`,
    });
  } catch (error: any) {
    console.error('Batch refresh story error:', error);
    res.status(500).json({
      error: {
        code: 'BATCH_REFRESH_FAILED',
        message: error.message || 'Failed to batch refresh story downstream',
      },
    });
  }
});

/**
 * POST /api/scenes/:sceneId/batch-refresh
 * 批量刷新场景的下游产物
 */
router.post('/scenes/:sceneId/batch-refresh', async (req, res) => {
  try {
    const { sceneId } = req.params;

    const result = await batchRefreshService.refreshSceneDownstream(sceneId);

    res.json({
      success: true,
      ...result,
      message: `批量刷新完成：${result.summary.completed}/${result.summary.total} 成功`,
    });
  } catch (error: any) {
    console.error('Batch refresh scene error:', error);
    res.status(500).json({
      error: {
        code: 'BATCH_REFRESH_FAILED',
        message: error.message || 'Failed to batch refresh scene downstream',
      },
    });
  }
});

/**
 * POST /api/shots/:shotId/batch-refresh
 * 批量刷新镜头的下游产物
 */
router.post('/shots/:shotId/batch-refresh', async (req, res) => {
  try {
    const { shotId } = req.params;

    const result = await batchRefreshService.refreshShotDownstream(shotId);

    res.json({
      success: true,
      ...result,
      message: `批量刷新完成：${result.summary.completed}/${result.summary.total} 成功`,
    });
  } catch (error: any) {
    console.error('Batch refresh shot error:', error);
    res.status(500).json({
      error: {
        code: 'BATCH_REFRESH_FAILED',
        message: error.message || 'Failed to batch refresh shot downstream',
      },
    });
  }
});

/**
 * GET /api/batch-refresh/:taskId/progress
 * 获取批量刷新进度
 */
router.get('/batch-refresh/:taskId/progress', async (req, res) => {
  try {
    const { taskId } = req.params;

    const progress = await batchRefreshService.getRefreshProgress(taskId);

    res.json(progress);
  } catch (error: any) {
    console.error('Get refresh progress error:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_PROGRESS_FAILED',
        message: error.message || 'Failed to fetch refresh progress',
      },
    });
  }
});

export default router;
