import { Router } from 'express';
import multer from 'multer';
import { audioUploadService } from '../services/AudioUploadService';

const router = Router();

// 配置 multer 使用内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许音频文件
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

/**
 * POST /api/projects/:projectId/audio/upload
 * 上传音频文件
 */
router.post(
  '/projects/:projectId/audio/upload',
  upload.single('audio'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { audioType } = req.body; // 'voiceover' or 'bgm'

      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'No audio file provided',
          },
        });
      }

      if (!audioType || !['voiceover', 'bgm'].includes(audioType)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AUDIO_TYPE',
            message: 'audioType must be either "voiceover" or "bgm"',
          },
        });
      }

      const result = await audioUploadService.saveAudioFile(
        projectId,
        req.file,
        audioType as 'voiceover' | 'bgm'
      );

      res.json({
        success: true,
        audioPath: result.audioPath,
        duration: result.duration,
        message: 'Audio file uploaded successfully',
      });
    } catch (error: any) {
      console.error('Audio upload error:', error);
      res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message || 'Failed to upload audio file',
        },
      });
    }
  }
);

/**
 * DELETE /api/projects/:projectId/audio/:audioType
 * 删除音频文件
 */
router.delete('/projects/:projectId/audio/:audioType', async (req, res) => {
  try {
    const { projectId, audioType } = req.params;

    if (!['voiceover', 'bgm'].includes(audioType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AUDIO_TYPE',
          message: 'audioType must be either "voiceover" or "bgm"',
        },
      });
    }

    await audioUploadService.deleteAudioFile(
      projectId,
      audioType as 'voiceover' | 'bgm'
    );

    res.json({
      success: true,
      message: 'Audio file deleted successfully',
    });
  } catch (error: any) {
    console.error('Audio delete error:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_FAILED',
        message: error.message || 'Failed to delete audio file',
      },
    });
  }
});

/**
 * GET /api/projects/:projectId/audio/:audioType
 * 获取音频文件信息
 */
router.get('/projects/:projectId/audio/:audioType', async (req, res) => {
  try {
    const { projectId, audioType } = req.params;

    if (!['voiceover', 'bgm'].includes(audioType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AUDIO_TYPE',
          message: 'audioType must be either "voiceover" or "bgm"',
        },
      });
    }

    const info = await audioUploadService.getAudioInfo(
      projectId,
      audioType as 'voiceover' | 'bgm'
    );

    if (!info) {
      return res.status(404).json({
        error: {
          code: 'AUDIO_NOT_FOUND',
          message: 'Audio file not found',
        },
      });
    }

    res.json(info);
  } catch (error: any) {
    console.error('Audio info error:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_FAILED',
        message: error.message || 'Failed to fetch audio info',
      },
    });
  }
});

export default router;
