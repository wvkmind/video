import { Router, Request, Response } from 'express';
import { CharacterPresetService } from '../services/CharacterPresetService';

const router = Router();
const characterService = new CharacterPresetService();

// POST /api/projects/:id/characters - 创建角色预设
router.post('/projects/:id/characters', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const character = await characterService.createCharacter({
      ...req.body,
      projectId: id,
    });
    res.status(201).json(character);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/characters - 获取角色列表
router.get('/projects/:id/characters', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const characters = await characterService.listCharacters(id);
    res.json(characters);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/characters/:id - 更新角色
router.put('/characters/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const character = await characterService.updateCharacter(id, req.body);
    res.json(character);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/characters/:id - 删除角色
router.delete('/characters/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await characterService.deleteCharacter(id);
    res.json({ message: 'Character deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
