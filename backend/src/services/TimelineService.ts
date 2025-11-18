import { AppDataSource } from '../config/database';
import { Timeline } from '../entities/Timeline';
import { Clip } from '../entities/Clip';
import { Shot } from '../entities/Shot';
import { FFmpegService } from './FFmpegService';
import { ClipService } from './ClipService';
import * as path from 'path';
import * as fs from 'fs/promises';
import { config } from '../config/env';

// Import types from Timeline entity
import { TimelineTrack, TimelineItem } from '../entities/Timeline';

export interface ExportVideoOptions {
  format?: 'mp4' | 'mov' | 'avi';
  quality?: 'low' | 'medium' | 'high';
  resolution?: string;
}

export interface ExportProjectOptions {
  format: 'edl' | 'xml' | 'json';
}

export class TimelineService {
  private timelineRepository = AppDataSource.getRepository(Timeline);
  private clipRepository = AppDataSource.getRepository(Clip);
  private shotRepository = AppDataSource.getRepository(Shot);
  private ffmpegService = new FFmpegService();
  private clipService: ClipService;

  constructor() {
    this.clipService = new ClipService();
  }

  /**
   * 获取项目时间线
   */
  async getTimeline(projectId: string): Promise<Timeline | null> {
    return await this.timelineRepository.findOne({
      where: { projectId },
      order: { version: 'DESC' },
    });
  }

  /**
   * 更新时间线
   */
  async updateTimeline(projectId: string, tracks: TimelineTrack[]): Promise<Timeline> {
    let timeline = await this.getTimeline(projectId);

    if (!timeline) {
      timeline = this.timelineRepository.create({
        projectId,
        version: 1,
        tracks: tracks,
      });
    } else {
      timeline.tracks = tracks;
      timeline.updatedAt = new Date();
    }

    return await this.timelineRepository.save(timeline);
  }

  /**
   * 导出合成视频
   */
  async exportVideo(projectId: string, options: ExportVideoOptions = {}): Promise<string> {
    const { format = 'mp4', quality = 'medium', resolution = '1920x1080' } = options;

    // 获取时间线
    const timeline = await this.getTimeline(projectId);
    if (!timeline) {
      throw new Error('Timeline not found');
    }

    const tracks: TimelineTrack[] = timeline.tracks;
    const videoTrack = tracks.find(t => t.trackType === 'video');
    
    if (!videoTrack || videoTrack.items.length === 0) {
      throw new Error('No video clips in timeline');
    }

    // 按时间排序片段
    const sortedItems = videoTrack.items.sort((a, b) => a.startTime - b.startTime);

    // 获取所有 clip 文件路径
    const clipFiles: string[] = [];
    const transitions: string[] = [];

    for (const timelineItem of sortedItems) {
      const clip = await this.clipRepository.findOne({
        where: { id: timelineItem.clipId },
      });

      if (!clip) {
        throw new Error(`Clip ${timelineItem.clipId} not found`);
      }

      if (!clip.videoPath) {
        throw new Error(`Clip ${timelineItem.clipId} has no video path`);
      }

      // 如果需要裁剪，先裁剪
      if (timelineItem.inPoint > 0 || timelineItem.outPoint < clip.duration) {
        const trimmedFile = path.join(
          config.storage.basePath,
          `trimmed_${clip.id}_${Date.now()}.mp4`
        );
        await this.ffmpegService.trimVideo(
          clip.videoPath,
          timelineItem.inPoint,
          timelineItem.outPoint,
          trimmedFile
        );
        clipFiles.push(trimmedFile);
      } else {
        clipFiles.push(clip.videoPath);
      }

      // 添加转场效果
      if (timelineItem.transitionType && timelineItem.transitionType !== 'cut') {
        transitions.push(timelineItem.transitionType);
      }
    }

    // 合并视频
    const outputFile = path.join(
      config.storage.basePath,
      `export_${projectId}_${Date.now()}.${format}`
    );

    await this.ffmpegService.mergeClips({
      inputFiles: clipFiles,
      outputFile,
      transitions,
    });

    // 如果有音频轨道，添加音频
    const audioTrack = tracks.find(t => t.trackType === 'audio');
    if (audioTrack && timeline.voiceoverAudioPath) {
      const finalOutput = path.join(
        config.storage.basePath,
        `final_${projectId}_${Date.now()}.${format}`
      );

      await this.ffmpegService.addAudioTrack({
        videoFile: outputFile,
        audioFile: timeline.voiceoverAudioPath,
        outputFile: finalOutput,
      });

      // 删除临时文件
      await fs.unlink(outputFile).catch(() => {});

      return finalOutput;
    }

    return outputFile;
  }

  /**
   * 导出工程文件
   */
  async exportProjectFile(projectId: string, options: ExportProjectOptions): Promise<string> {
    const { format } = options;

    const timeline = await this.getTimeline(projectId);
    if (!timeline) {
      throw new Error('Timeline not found');
    }

    const tracks: TimelineTrack[] = timeline.tracks;
    const outputFile = path.join(
      config.storage.basePath,
      `project_${projectId}_${Date.now()}.${format}`
    );

    switch (format) {
      case 'json':
        await fs.writeFile(outputFile, JSON.stringify({ timeline, tracks }, null, 2));
        break;

      case 'edl':
        const edlContent = this.generateEDL(tracks);
        await fs.writeFile(outputFile, edlContent);
        break;

      case 'xml':
        const xmlContent = this.generateFCPXML(tracks);
        await fs.writeFile(outputFile, xmlContent);
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return outputFile;
  }

  /**
   * 保存时间线版本
   */
  async saveTimelineVersion(projectId: string, versionName: string): Promise<Timeline> {
    const currentTimeline = await this.getTimeline(projectId);
    if (!currentTimeline) {
      throw new Error('Timeline not found');
    }

    const newVersion = this.timelineRepository.create({
      projectId,
      version: currentTimeline.version + 1,
      versionName,
      tracks: currentTimeline.tracks,
      voiceoverAudioPath: currentTimeline.voiceoverAudioPath,
      bgmAudioPath: currentTimeline.bgmAudioPath,
    });

    return await this.timelineRepository.save(newVersion);
  }

  /**
   * 获取时间线版本列表
   */
  async getTimelineVersions(projectId: string): Promise<Timeline[]> {
    return await this.timelineRepository.find({
      where: { projectId },
      order: { version: 'DESC' },
    });
  }

  /**
   * 恢复时间线版本
   */
  async restoreTimelineVersion(projectId: string, versionId: string): Promise<Timeline> {
    const versionToRestore = await this.timelineRepository.findOne({
      where: { id: versionId, projectId },
    });

    if (!versionToRestore) {
      throw new Error('Version not found');
    }

    const currentTimeline = await this.getTimeline(projectId);
    const newVersion = currentTimeline ? currentTimeline.version + 1 : 1;

    const restoredTimeline = this.timelineRepository.create({
      projectId,
      version: newVersion,
      versionName: `Restored from v${versionToRestore.version}`,
      tracks: versionToRestore.tracks,
      voiceoverAudioPath: versionToRestore.voiceoverAudioPath,
      bgmAudioPath: versionToRestore.bgmAudioPath,
    });

    return await this.timelineRepository.save(restoredTimeline);
  }

  /**
   * 检测时间线冲突
   */
  detectConflicts(tracks: TimelineTrack[]): Array<{ clipId: string; message: string }> {
    const conflicts: Array<{ clipId: string; message: string }> = [];

    for (const track of tracks) {
      const sortedClips = track.items.sort((a, b) => a.startTime - b.startTime);

      for (let i = 0; i < sortedClips.length - 1; i++) {
        const current = sortedClips[i];
        const next = sortedClips[i + 1];

        const currentEndTime = current.startTime + current.duration;
        if (currentEndTime > next.startTime) {
          conflicts.push({
            clipId: current.itemId,
            message: `Clip ${current.itemId} overlaps with ${next.itemId}`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 计算片段时长
   */
  calculateClipDuration(clip: TimelineItem): number {
    return clip.outPoint - clip.inPoint;
  }

  /**
   * 生成 EDL 格式
   */
  private generateEDL(tracks: TimelineTrack[]): string {
    let edl = 'TITLE: AI Video Production\n';
    edl += 'FCM: NON-DROP FRAME\n\n';

    let eventNumber = 1;

    for (const track of tracks) {
      if (track.trackType !== 'video') continue;

      for (const item of track.items) {
        const endTime = item.startTime + item.duration;
        edl += `${String(eventNumber).padStart(3, '0')}  001      V     C        `;
        edl += `${this.formatTimecode(item.inPoint)} ${this.formatTimecode(item.outPoint)} `;
        edl += `${this.formatTimecode(item.startTime)} ${this.formatTimecode(endTime)}\n`;
        eventNumber++;
      }
    }

    return edl;
  }

  /**
   * 生成 FCP XML 格式
   */
  private generateFCPXML(tracks: TimelineTrack[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<xmeml version="5">\n';
    xml += '  <sequence>\n';
    xml += '    <name>AI Video Production</name>\n';
    xml += '    <media>\n';

    for (const track of tracks) {
      xml += `      <${track.trackType}>\n`;
      xml += `        <track>\n`;

      for (const item of track.items) {
        const endTime = item.startTime + item.duration;
        xml += `          <clipitem id="${item.itemId}">\n`;
        xml += `            <start>${item.startTime}</start>\n`;
        xml += `            <end>${endTime}</end>\n`;
        xml += `            <in>${item.inPoint}</in>\n`;
        xml += `            <out>${item.outPoint}</out>\n`;
        xml += `          </clipitem>\n`;
      }

      xml += `        </track>\n`;
      xml += `      </${track.trackType}>\n`;
    }

    xml += '    </media>\n';
    xml += '  </sequence>\n';
    xml += '</xmeml>\n';

    return xml;
  }

  /**
   * 格式化时间码
   */
  private formatTimecode(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 24);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  }

  /**
   * 检测时间线中的帧匹配问题
   * Validates: Requirements 9.5
   */
  async detectFrameMismatches(projectId: string): Promise<
    Array<{
      clip1Id: string;
      clip2Id: string;
      similarity: number;
      hasMismatch: boolean;
      message: string;
    }>
  > {
    const timeline = await this.getTimeline(projectId);
    if (!timeline) {
      throw new Error('Timeline not found');
    }

    const tracks: TimelineTrack[] = timeline.tracks;
    const videoTrack = tracks.find((t) => t.trackType === 'video');

    if (!videoTrack || videoTrack.items.length < 2) {
      return []; // No adjacent clips to compare
    }

    const mismatches: Array<{
      clip1Id: string;
      clip2Id: string;
      similarity: number;
      hasMismatch: boolean;
      message: string;
    }> = [];

    // Sort clips by start time
    const sortedItems = videoTrack.items.sort((a, b) => a.startTime - b.startTime);

    // Check each adjacent pair
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const currentItem = sortedItems[i];
      const nextItem = sortedItems[i + 1];

      // Get the clips to find their shots
      const currentClip = await this.clipRepository.findOne({
        where: { id: currentItem.clipId },
        relations: ['shot'],
      });
      const nextClip = await this.clipRepository.findOne({
        where: { id: nextItem.clipId },
        relations: ['shot'],
      });

      if (!currentClip || !nextClip) {
        continue;
      }

      // Only check if the shots are marked for frame-to-frame transition
      if (
        nextClip.shot &&
        nextClip.shot.useLastFrameAsFirst &&
        nextClip.shot.previousShotId === currentClip.shotId
      ) {
        try {
          const result = await this.clipService.detectFrameMismatch(
            currentItem.clipId,
            nextItem.clipId
          );

          mismatches.push({
            clip1Id: currentItem.itemId,
            clip2Id: nextItem.itemId,
            similarity: result.similarity,
            hasMismatch: result.hasMismatch,
            message: result.message,
          });
        } catch (error) {
          console.error(`Failed to detect mismatch between clips:`, error);
        }
      }
    }

    return mismatches;
  }

  /**
   * 检测单个衔接点的帧匹配
   */
  async detectTransitionMismatch(
    clip1Id: string,
    clip2Id: string
  ): Promise<{
    hasMismatch: boolean;
    similarity: number;
    message: string;
  }> {
    return await this.clipService.detectFrameMismatch(clip1Id, clip2Id);
  }
}
