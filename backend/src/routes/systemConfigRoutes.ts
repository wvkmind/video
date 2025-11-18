import { Router, Request, Response } from 'express';
import { SystemConfigService } from '../services/SystemConfigService';

const router = Router();
const systemConfigService = new SystemConfigService();

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
 * GET /api/system/config - 获取系统配置
 * Validates: Requirements 2.5, 7.1
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await systemConfigService.getConfig();

    // Don't expose sensitive information like API keys in full
    const safeConfig = {
      ...config,
      poeApiKey: config.poeApiKey ? '***' + config.poeApiKey.slice(-4) : '',
    };

    res.json(safeConfig);
  } catch (error: any) {
    console.error('Error getting system config:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get system configuration');
  }
});

/**
 * PUT /api/system/config - 更新系统配置
 * Validates: Requirements 2.5, 7.1
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    const config = await systemConfigService.updateConfig(updates);

    // Don't expose sensitive information
    const safeConfig = {
      ...config,
      poeApiKey: config.poeApiKey ? '***' + config.poeApiKey.slice(-4) : '',
    };

    res.json(safeConfig);
  } catch (error: any) {
    console.error('Error updating system config:', error);
    if (error.message.includes('must be') || error.message.includes('cannot be')) {
      sendError(res, 400, 'VALIDATION_ERROR', error.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update system configuration');
    }
  }
});

/**
 * POST /api/system/config/validate - 验证所有配置
 * Validates: Requirements 2.5, 7.1
 */
router.post('/config/validate', async (req: Request, res: Response) => {
  try {
    const results = await systemConfigService.validateAllConfigs();

    const allValid = Object.values(results).every(r => r.valid);

    res.json({
      valid: allValid,
      results,
    });
  } catch (error: any) {
    console.error('Error validating system config:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to validate system configuration');
  }
});

/**
 * POST /api/system/config/validate/comfyui - 验证 ComfyUI 配置
 * Validates: Requirements 7.1
 */
router.post('/config/validate/comfyui', async (req: Request, res: Response) => {
  try {
    const { baseUrl } = req.body;

    const result = await systemConfigService.validateComfyUIConfig(baseUrl);

    res.json(result);
  } catch (error: any) {
    console.error('Error validating ComfyUI config:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to validate ComfyUI configuration');
  }
});

/**
 * POST /api/system/config/validate/poe - 验证 Poe API 配置
 * Validates: Requirements 2.5
 */
router.post('/config/validate/poe', async (req: Request, res: Response) => {
  try {
    const { apiKey, apiUrl } = req.body;

    const result = await systemConfigService.validatePoeAPIConfig(apiKey, apiUrl);

    res.json(result);
  } catch (error: any) {
    console.error('Error validating Poe API config:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to validate Poe API configuration');
  }
});

/**
 * POST /api/system/config/validate/ffmpeg - 验证 FFmpeg 配置
 * Validates: Requirements 7.1
 */
router.post('/config/validate/ffmpeg', async (req: Request, res: Response) => {
  try {
    const { ffmpegPath } = req.body;

    const result = await systemConfigService.validateFFmpegConfig(ffmpegPath);

    res.json(result);
  } catch (error: any) {
    console.error('Error validating FFmpeg config:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to validate FFmpeg configuration');
  }
});

/**
 * POST /api/system/config/validate/storage - 验证存储路径配置
 * Validates: Requirements 7.1
 */
router.post('/config/validate/storage', async (req: Request, res: Response) => {
  try {
    const { storagePath } = req.body;

    const result = await systemConfigService.validateStoragePath(storagePath);

    res.json(result);
  } catch (error: any) {
    console.error('Error validating storage path:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to validate storage path');
  }
});

export default router;
