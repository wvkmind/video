import { Router, Request, Response } from 'express';
import { TimelineService } from '../services/TimelineService';

const router = Router();
const timelineService = new TimelineService();

// GET /api/projects/:id/timeline - 获取时间线
router.get('/projects/:id/timeline', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timeline = await timelineService.getTimeline(id);

    if (!timeline) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id/timeline - 更新时间线
router.put('/projects/:id/timeline', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tracks } = req.body;

    // 检测冲突
    const conflicts = timelineService.detectConflicts(tracks);
    if (conflicts.length > 0) {
      return res.status(400).json({ error: 'Timeline conflicts detected', conflicts });
    }

    const timeline = await timelineService.updateTimeline(id, tracks);

    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/timeline/export-video - 导出合成视频
router.post('/projects/:id/timeline/export-video', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format, quality, resolution } = req.body;

    const outputFile = await timelineService.exportVideo(id, {
      format,
      quality,
      resolution,
    });

    res.json({ outputFile, message: 'Video exported successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/timeline/export-project - 导出工程文件
router.post('/projects/:id/timeline/export-project', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format } = req.body;

    if (!['edl', 'xml', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Must be edl, xml, or json' });
    }

    const outputFile = await timelineService.exportProjectFile(id, { format });

    res.json({ outputFile, message: 'Project file exported successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/timeline/versions - 保存时间线版本
router.post('/projects/:id/timeline/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { versionName } = req.body;

    const timeline = await timelineService.saveTimelineVersion(id, versionName);

    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/timeline/versions - 获取版本列表
router.get('/projects/:id/timeline/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versions = await timelineService.getTimelineVersions(id);

    res.json(versions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/timeline/restore/:versionId - 恢复版本
router.post('/projects/:id/timeline/restore/:versionId', async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;

    const timeline = await timelineService.restoreTimelineVersion(id, versionId);

    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
