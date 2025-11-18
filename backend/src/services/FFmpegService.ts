import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { config } from '../config/env';

const execAsync = promisify(exec);

export interface MergeClipsOptions {
  inputFiles: string[];
  outputFile: string;
  transitions?: string[];
  fps?: number;
}

export interface ExtractFrameOptions {
  videoFile: string;
  frameNumber: number;
  outputFile: string;
}

export interface AddAudioOptions {
  videoFile: string;
  audioFile: string;
  outputFile: string;
  audioVolume?: number;
}

export interface ApplyTransitionOptions {
  clip1: string;
  clip2: string;
  outputFile: string;
  transitionType: 'fade' | 'dissolve' | 'wipe';
  duration?: number;
}

export class FFmpegService {
  private ffmpegPath: string;

  constructor() {
    this.ffmpegPath = config.ffmpeg.path;
  }

  /**
   * 合并多个视频片段
   */
  async mergeClips(options: MergeClipsOptions): Promise<string> {
    const { inputFiles, outputFile, transitions = [], fps = 24 } = options;

    try {
      // 创建临时文件列表
      const listFile = path.join(path.dirname(outputFile), 'filelist.txt');
      const fileListContent = inputFiles.map(f => `file '${f}'`).join('\n');
      await fs.writeFile(listFile, fileListContent);

      // 如果没有转场效果，使用简单的 concat
      if (transitions.length === 0) {
        const command = `${this.ffmpegPath} -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`;
        await execAsync(command);
      } else {
        // 使用 filter_complex 应用转场效果
        const filterComplex = this.buildTransitionFilter(inputFiles, transitions, fps);
        const command = `${this.ffmpegPath} ${inputFiles.map((f, i) => `-i "${f}"`).join(' ')} -filter_complex "${filterComplex}" -c:v libx264 -preset medium -crf 23 "${outputFile}"`;
        await execAsync(command);
      }

      // 清理临时文件
      await fs.unlink(listFile).catch(() => {});

      return outputFile;
    } catch (error: any) {
      throw new Error(`Failed to merge clips: ${error.message}`);
    }
  }

  /**
   * 从视频中提取指定帧
   */
  async extractFrame(options: ExtractFrameOptions): Promise<string> {
    const { videoFile, frameNumber, outputFile } = options;

    try {
      // 计算时间戳（假设 24fps）
      const timestamp = frameNumber / 24;
      const command = `${this.ffmpegPath} -i "${videoFile}" -ss ${timestamp} -vframes 1 "${outputFile}"`;
      await execAsync(command);

      return outputFile;
    } catch (error: any) {
      throw new Error(`Failed to extract frame: ${error.message}`);
    }
  }

  /**
   * 添加音频轨道到视频
   */
  async addAudioTrack(options: AddAudioOptions): Promise<string> {
    const { videoFile, audioFile, outputFile, audioVolume = 1.0 } = options;

    try {
      const volumeFilter = audioVolume !== 1.0 ? `volume=${audioVolume}` : '';
      const filterArg = volumeFilter ? `-filter:a "${volumeFilter}"` : '';
      
      const command = `${this.ffmpegPath} -i "${videoFile}" -i "${audioFile}" ${filterArg} -c:v copy -c:a aac -shortest "${outputFile}"`;
      await execAsync(command);

      return outputFile;
    } catch (error: any) {
      throw new Error(`Failed to add audio track: ${error.message}`);
    }
  }

  /**
   * 应用转场效果
   */
  async applyTransition(options: ApplyTransitionOptions): Promise<string> {
    const { clip1, clip2, outputFile, transitionType, duration = 1.0 } = options;

    try {
      let filterComplex = '';

      switch (transitionType) {
        case 'fade':
          filterComplex = `[0:v][1:v]xfade=transition=fade:duration=${duration}:offset=0[v]`;
          break;
        case 'dissolve':
          filterComplex = `[0:v][1:v]xfade=transition=dissolve:duration=${duration}:offset=0[v]`;
          break;
        case 'wipe':
          filterComplex = `[0:v][1:v]xfade=transition=wipeleft:duration=${duration}:offset=0[v]`;
          break;
        default:
          throw new Error(`Unsupported transition type: ${transitionType}`);
      }

      const command = `${this.ffmpegPath} -i "${clip1}" -i "${clip2}" -filter_complex "${filterComplex}" -map "[v]" "${outputFile}"`;
      await execAsync(command);

      return outputFile;
    } catch (error: any) {
      throw new Error(`Failed to apply transition: ${error.message}`);
    }
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(videoFile: string): Promise<any> {
    try {
      const command = `${this.ffmpegPath.replace('ffmpeg', 'ffprobe')} -v quiet -print_format json -show_format -show_streams "${videoFile}"`;
      const { stdout } = await execAsync(command);
      return JSON.parse(stdout);
    } catch (error: any) {
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  /**
   * 构建转场滤镜
   */
  private buildTransitionFilter(inputFiles: string[], transitions: string[], fps: number): string {
    if (inputFiles.length === 1) {
      return '[0:v]copy[v]';
    }

    let filter = '';
    let currentLabel = '0:v';

    for (let i = 0; i < inputFiles.length - 1; i++) {
      const nextLabel = `${i + 1}:v`;
      const outputLabel = i === inputFiles.length - 2 ? 'v' : `v${i}`;
      const transition = transitions[i] || 'fade';
      
      filter += `[${currentLabel}][${nextLabel}]xfade=transition=${transition}:duration=1:offset=0[${outputLabel}];`;
      currentLabel = outputLabel;
    }

    return filter.slice(0, -1); // 移除最后的分号
  }

  /**
   * 裁剪视频
   */
  async trimVideo(videoFile: string, startTime: number, endTime: number, outputFile: string): Promise<string> {
    try {
      const duration = endTime - startTime;
      const command = `${this.ffmpegPath} -i "${videoFile}" -ss ${startTime} -t ${duration} -c copy "${outputFile}"`;
      await execAsync(command);

      return outputFile;
    } catch (error: any) {
      throw new Error(`Failed to trim video: ${error.message}`);
    }
  }

  /**
   * 混合多个音频轨道
   */
  async mixAudioTracks(audioFiles: string[], outputFile: string, volumes?: number[]): Promise<string> {
    try {
      const inputs = audioFiles.map((f, i) => `-i "${f}"`).join(' ');
      const volumeFilters = volumes 
        ? audioFiles.map((_, i) => `[${i}:a]volume=${volumes[i]}[a${i}]`).join(';')
        : audioFiles.map((_, i) => `[${i}:a]`).join('');
      
      const mixFilter = volumes
        ? `${volumeFilters};${audioFiles.map((_, i) => `[a${i}]`).join('')}amix=inputs=${audioFiles.length}[a]`
        : `${volumeFilters}amix=inputs=${audioFiles.length}[a]`;

      const command = `${this.ffmpegPath} ${inputs} -filter_complex "${mixFilter}" -map "[a]" "${outputFile}"`;
      await execAsync(command);

      return outputFile;
    } catch (error: any) {
      throw new Error(`Failed to mix audio tracks: ${error.message}`);
    }
  }

  /**
   * 提取视频的最后一帧
   * Validates: Requirements 9.3
   */
  async extractLastFrame(videoFile: string, outputFile: string): Promise<string> {
    try {
      // Get video duration first
      const info = await this.getVideoInfo(videoFile);
      const duration = parseFloat(info.format.duration);

      if (isNaN(duration) || duration <= 0) {
        throw new Error('Invalid video duration');
      }

      // Extract the last frame (slightly before the end to avoid black frames)
      const timestamp = Math.max(0, duration - 0.1);
      const command = `${this.ffmpegPath} -ss ${timestamp} -i "${videoFile}" -vframes 1 -q:v 2 "${outputFile}"`;
      await execAsync(command);

      return outputFile;
    } catch (error: any) {
      throw new Error(`Failed to extract last frame: ${error.message}`);
    }
  }

  /**
   * 提取视频的第一帧
   */
  async extractFirstFrame(videoFile: string, outputFile: string): Promise<string> {
    try {
      const command = `${this.ffmpegPath} -i "${videoFile}" -vframes 1 -q:v 2 "${outputFile}"`;
      await execAsync(command);

      return outputFile;
    } catch (error: any) {
      throw new Error(`Failed to extract first frame: ${error.message}`);
    }
  }

  /**
   * 比较两个图像的相似度
   * 使用 SSIM (Structural Similarity Index) 或简单的像素差异
   * Validates: Requirements 9.5
   */
  async compareFrames(frame1: string, frame2: string): Promise<{
    similarity: number;
    isMatch: boolean;
  }> {
    try {
      // Use ffmpeg to calculate SSIM (Structural Similarity Index)
      // SSIM ranges from 0 to 1, where 1 means identical
      const command = `${this.ffmpegPath} -i "${frame1}" -i "${frame2}" -lavfi "ssim" -f null -`;
      const { stderr } = await execAsync(command);

      // Parse SSIM value from stderr
      // Example output: "SSIM Y:0.987654 U:0.987654 V:0.987654 All:0.987654"
      const ssimMatch = stderr.match(/SSIM.*All:([0-9.]+)/);
      
      if (ssimMatch && ssimMatch[1]) {
        const similarity = parseFloat(ssimMatch[1]);
        const threshold = 0.85; // 85% similarity threshold
        
        return {
          similarity,
          isMatch: similarity >= threshold,
        };
      }

      // Fallback: if SSIM parsing fails, use a simpler method
      return await this.compareFramesSimple(frame1, frame2);
    } catch (error: any) {
      console.warn('SSIM comparison failed, using simple comparison:', error.message);
      return await this.compareFramesSimple(frame1, frame2);
    }
  }

  /**
   * 简单的帧比较方法（备用）
   */
  private async compareFramesSimple(frame1: string, frame2: string): Promise<{
    similarity: number;
    isMatch: boolean;
  }> {
    try {
      // Use ffmpeg to calculate mean squared error
      const command = `${this.ffmpegPath} -i "${frame1}" -i "${frame2}" -lavfi "psnr" -f null -`;
      const { stderr } = await execAsync(command);

      // Parse PSNR value (Peak Signal-to-Noise Ratio)
      // Higher PSNR means more similar images
      const psnrMatch = stderr.match(/PSNR.*average:([0-9.]+)/);
      
      if (psnrMatch && psnrMatch[1]) {
        const psnr = parseFloat(psnrMatch[1]);
        // Convert PSNR to similarity score (0-1)
        // PSNR > 30 dB is generally considered good quality
        const similarity = Math.min(1, psnr / 40);
        const threshold = 0.75;
        
        return {
          similarity,
          isMatch: similarity >= threshold,
        };
      }

      // If all else fails, assume no match
      return {
        similarity: 0,
        isMatch: false,
      };
    } catch (error: any) {
      throw new Error(`Failed to compare frames: ${error.message}`);
    }
  }
}
