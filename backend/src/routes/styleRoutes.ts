import { Router, Request, Response } from 'express';
import { StylePresetService } from '../services/StylePresetService';

const router = Router();
const styleService = new StylePresetService();

// POST /api/styles - 创建风格预设
router.post('/styles', async (req: Request, res: Response) => {
  try {
    const style = await styleService.createStyle(req.body);
    res.status(201).json(style);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/styles - 获取风格列表
router.get('/styles', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    // If projectId is 'global', get global styles (projectId = null)
    // If projectId is provided, get project-specific styles
    // If projectId is undefined, get all styles
    const styles = await styleService.listStyles(
      projectId === 'global' ? null : (projectId as string | undefined)
    );
    res.json(styles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/styles/:id - 更新风格
router.put('/styles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const style = await styleService.updateStyle(id, req.body);
    res.json(style);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/styles/:id - 删除风格
router.delete('/styles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await styleService.deleteStyle(id);
    res.json({ message: 'Style deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/styles/:id/apply-to-shots - 批量应用风格
router.post('/styles/:id/apply-to-shots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shotIds } = req.body;

    if (!Array.isArray(shotIds)) {
      return res.status(400).json({ error: 'shotIds must be an array' });
    }

    await styleService.applyStyleToShots(id, shotIds);
    res.json({ message: 'Style applied successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
