import { AppDataSource } from '../config/database';
import { Story } from '../entities/Story';
import { Scene } from '../entities/Scene';
import { Shot } from '../entities/Shot';
import { Keyframe } from '../entities/Keyframe';
import { Clip } from '../entities/Clip';

interface RefreshTask {
  entityType: 'scene' | 'shot' | 'keyframe' | 'clip';
  entityId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export class BatchRefreshService {
  private storyRepository = AppDataSource.getRepository(Story);
  private sceneRepository = AppDataSource.getRepository(Scene);
  private shotRepository = AppDataSource.getRepository(Shot);
  private keyframeRepository = AppDataSource.getRepository(Keyframe);
  private clipRepository = AppDataSource.getRepository(Clip);

  /**
   * 批量刷新故事的下游产物（场景和镜头）
   */
  async refreshStoryDownstream(projectId: string): Promise<{
    tasks: RefreshTask[];
    summary: { total: number; completed: number; failed: number };
  }> {
    const tasks: RefreshTask[] = [];

    // 获取所有场景
    const scenes = await this.sceneRepository.find({
      where: { projectId },
      order: { sceneNumber: 'ASC' },
    });

    // 为每个场景创建刷新任务
    for (const scene of scenes) {
      tasks.push({
        entityType: 'scene',
        entityId: scene.id,
        status: 'pending',
      });
    }

    // 执行刷新任务
    const results = await this.executeTasks(tasks);

    return {
      tasks: results,
      summary: this.getSummary(results),
    };
  }

  /**
   * 批量刷新场景的下游产物（镜头）
   */
  async refreshSceneDownstream(sceneId: string): Promise<{
    tasks: RefreshTask[];
    summary: { total: number; completed: number; failed: number };
  }> {
    const tasks: RefreshTask[] = [];

    // 获取所有镜头
    const shots = await this.shotRepository.find({
      where: { sceneId },
      order: { sequenceNumber: 'ASC' },
    });

    // 为每个镜头创建刷新任务
    for (const shot of shots) {
      tasks.push({
        entityType: 'shot',
        entityId: shot.id,
        status: 'pending',
      });
    }

    // 执行刷新任务
    const results = await this.executeTasks(tasks);

    return {
      tasks: results,
      summary: this.getSummary(results),
    };
  }

  /**
   * 批量刷新镜头的下游产物（关键帧和视频片段）
   */
  async refreshShotDownstream(shotId: string): Promise<{
    tasks: RefreshTask[];
    summary: { total: number; completed: number; failed: number };
  }> {
    const tasks: RefreshTask[] = [];

    // 获取所有关键帧
    const keyframes = await this.keyframeRepository.find({
      where: { shotId },
      order: { createdAt: 'ASC' },
    });

    // 为每个关键帧创建刷新任务
    for (const keyframe of keyframes) {
      tasks.push({
        entityType: 'keyframe',
        entityId: keyframe.id,
        status: 'pending',
      });
    }

    // 获取所有视频片段
    const clips = await this.clipRepository.find({
      where: { shotId },
    });

    // 为每个视频片段创建刷新任务
    for (const clip of clips) {
      tasks.push({
        entityType: 'clip',
        entityId: clip.id,
        status: 'pending',
      });
    }

    // 执行刷新任务
    const results = await this.executeTasks(tasks);

    return {
      tasks: results,
      summary: this.getSummary(results),
    };
  }

  /**
   * 执行刷新任务
   */
  private async executeTasks(tasks: RefreshTask[]): Promise<RefreshTask[]> {
    const results: RefreshTask[] = [];

    for (const task of tasks) {
      const result: RefreshTask = { ...task, status: 'processing' };

      try {
        switch (task.entityType) {
          case 'scene':
            // 重新生成场景脚本
            // TODO: 实现场景脚本重新生成
            console.log(`Regenerating scene ${task.entityId}`);
            break;

          case 'shot':
            // 重新生成镜头描述
            // TODO: 实现镜头描述重新生成
            console.log(`Regenerating shot ${task.entityId}`);
            break;

          case 'keyframe':
            // 重新生成关键帧图像
            // TODO: 实现关键帧图像重新生成
            console.log(`Regenerating keyframe ${task.entityId}`);
            break;

          case 'clip':
            // 重新生成视频片段
            // TODO: 实现视频片段重新生成
            console.log(`Regenerating clip ${task.entityId}`);
            break;
        }

        result.status = 'completed';
      } catch (error: any) {
        result.status = 'failed';
        result.error = error.message || 'Unknown error';
      }

      results.push(result);
    }

    return results;
  }

  /**
   * 生成任务摘要
   */
  private getSummary(tasks: RefreshTask[]): {
    total: number;
    completed: number;
    failed: number;
  } {
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
    };
  }

  /**
   * 获取刷新进度
   */
  async getRefreshProgress(taskId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    tasks: RefreshTask[];
  }> {
    // 这里可以实现基于 Redis 或数据库的进度跟踪
    // 简化版本直接返回模拟数据
    return {
      status: 'completed',
      progress: 100,
      tasks: [],
    };
  }
}

export const batchRefreshService = new BatchRefreshService();
