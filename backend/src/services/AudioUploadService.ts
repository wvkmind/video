import { promises as fs } from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { Timeline } from '../entities/Timeline';

export class AudioUploadService {
  private timelineRepository = AppDataSource.getRepository(Timeline);

  /**
   * 保存上传的音频文件并更新时间线
   */
  async saveAudioFile(
    projectId: string,
    file: Express.Multer.File,
    audioType: 'voiceover' | 'bgm'
  ): Promise<{ audioPath: string; duration?: number }> {
    // 确保存储目录存在
    const audioDir = path.join(process.cwd(), 'storage', 'audio', projectId);
    await fs.mkdir(audioDir, { recursive: true });

    // 生成文件名
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${audioType}_${timestamp}${ext}`;
    const audioPath = path.join(audioDir, filename);

    // 保存文件
    await fs.writeFile(audioPath, file.buffer);

    // 获取音频时长（如果可能）
    const duration = await this.getAudioDuration(audioPath);

    // 更新时间线
    const timeline = await this.timelineRepository.findOne({
      where: { projectId },
    });

    if (timeline) {
      if (audioType === 'voiceover') {
        timeline.voiceoverAudioPath = audioPath;
      } else {
        timeline.bgmAudioPath = audioPath;
      }
      await this.timelineRepository.save(timeline);
    }

    return {
      audioPath: `/storage/audio/${projectId}/${filename}`,
      duration,
    };
  }

  /**
   * 获取音频时长（使用 ffprobe）
   */
  private async getAudioDuration(audioPath: string): Promise<number | undefined> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      );

      const duration = parseFloat(stdout.trim());
      return isNaN(duration) ? undefined : duration;
    } catch (error) {
      console.error('Failed to get audio duration:', error);
      return undefined;
    }
  }

  /**
   * 删除音频文件
   */
  async deleteAudioFile(
    projectId: string,
    audioType: 'voiceover' | 'bgm'
  ): Promise<void> {
    const timeline = await this.timelineRepository.findOne({
      where: { projectId },
    });

    if (!timeline) {
      throw new Error('Timeline not found');
    }

    const audioPath =
      audioType === 'voiceover'
        ? timeline.voiceoverAudioPath
        : timeline.bgmAudioPath;

    if (audioPath) {
      // 删除文件
      const fullPath = path.join(process.cwd(), audioPath.replace(/^\//, ''));
      try {
        await fs.unlink(fullPath);
      } catch (error) {
        console.error('Failed to delete audio file:', error);
      }

      // 更新时间线
      if (audioType === 'voiceover') {
        timeline.voiceoverAudioPath = undefined;
      } else {
        timeline.bgmAudioPath = undefined;
      }
      await this.timelineRepository.save(timeline);
    }
  }

  /**
   * 获取音频文件信息
   */
  async getAudioInfo(
    projectId: string,
    audioType: 'voiceover' | 'bgm'
  ): Promise<{ path: string; duration?: number } | null> {
    const timeline = await this.timelineRepository.findOne({
      where: { projectId },
    });

    if (!timeline) {
      return null;
    }

    const audioPath =
      audioType === 'voiceover'
        ? timeline.voiceoverAudioPath
        : timeline.bgmAudioPath;

    if (!audioPath) {
      return null;
    }

    const fullPath = path.join(process.cwd(), audioPath.replace(/^\//, ''));
    const duration = await this.getAudioDuration(fullPath);

    return {
      path: audioPath,
      duration,
    };
  }
}

export const audioUploadService = new AudioUploadService();
