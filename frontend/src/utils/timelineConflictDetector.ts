import { TimelineClip } from '../components/timeline/TimelineTrack';

export interface ConflictInfo {
  type: 'order' | 'overlap' | 'gap';
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedClips: string[];
  suggestedFix?: string;
}

export interface StoryboardShot {
  id: string;
  shotId: string;
  sceneId: string;
  sequenceNumber: number;
}

/**
 * 检测时间线Clip顺序与分镜页顺序的冲突
 */
export function detectOrderConflicts(
  timelineClips: TimelineClip[],
  storyboardShots: StoryboardShot[]
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // 按开始时间排序时间线clips
  const sortedClips = [...timelineClips].sort((a, b) => a.startTime - b.startTime);

  // 创建shot ID到sequence number的映射
  const shotSequenceMap = new Map<string, number>();
  storyboardShots.forEach((shot) => {
    shotSequenceMap.set(shot.id, shot.sequenceNumber);
  });

  // 检查顺序冲突
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const currentClip = sortedClips[i];
    const nextClip = sortedClips[i + 1];

    const currentSeq = shotSequenceMap.get(currentClip.id);
    const nextSeq = shotSequenceMap.get(nextClip.id);

    if (currentSeq !== undefined && nextSeq !== undefined) {
      if (currentSeq > nextSeq) {
        conflicts.push({
          type: 'order',
          severity: 'warning',
          message: `Clip "${currentClip.label}" 在时间线上位于 "${nextClip.label}" 之前，但在分镜页中顺序相反`,
          affectedClips: [currentClip.id, nextClip.id],
          suggestedFix: `调整时间线顺序以匹配分镜页，或更新分镜页顺序`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * 检测Clip之间的重叠
 */
export function detectOverlaps(clips: TimelineClip[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);

  for (let i = 0; i < sortedClips.length - 1; i++) {
    const currentClip = sortedClips[i];
    const nextClip = sortedClips[i + 1];

    const currentEnd = currentClip.startTime + currentClip.duration;
    const overlap = currentEnd - nextClip.startTime;

    if (overlap > 0) {
      conflicts.push({
        type: 'overlap',
        severity: 'error',
        message: `Clip "${currentClip.label}" 与 "${nextClip.label}" 重叠 ${overlap.toFixed(2)} 秒`,
        affectedClips: [currentClip.id, nextClip.id],
        suggestedFix: `调整 "${nextClip.label}" 的开始时间到 ${currentEnd.toFixed(2)} 秒`,
      });
    }
  }

  return conflicts;
}

/**
 * 检测Clip之间的间隙
 */
export function detectGaps(clips: TimelineClip[], maxGapDuration: number = 0.5): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);

  for (let i = 0; i < sortedClips.length - 1; i++) {
    const currentClip = sortedClips[i];
    const nextClip = sortedClips[i + 1];

    const currentEnd = currentClip.startTime + currentClip.duration;
    const gap = nextClip.startTime - currentEnd;

    if (gap > maxGapDuration) {
      conflicts.push({
        type: 'gap',
        severity: 'info',
        message: `Clip "${currentClip.label}" 与 "${nextClip.label}" 之间有 ${gap.toFixed(2)} 秒间隙`,
        affectedClips: [currentClip.id, nextClip.id],
        suggestedFix: `考虑添加转场或调整Clip位置`,
      });
    }
  }

  return conflicts;
}

/**
 * 综合检测所有冲突
 */
export function detectAllConflicts(
  timelineClips: TimelineClip[],
  storyboardShots?: StoryboardShot[]
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // 检测重叠
  conflicts.push(...detectOverlaps(timelineClips));

  // 检测间隙
  conflicts.push(...detectGaps(timelineClips));

  // 如果提供了分镜页数据，检测顺序冲突
  if (storyboardShots) {
    conflicts.push(...detectOrderConflicts(timelineClips, storyboardShots));
  }

  return conflicts;
}

/**
 * 自动修复冲突（如果可能）
 */
export function autoFixConflicts(
  clips: TimelineClip[],
  conflicts: ConflictInfo[]
): TimelineClip[] {
  const fixedClips = [...clips];

  conflicts.forEach((conflict) => {
    if (conflict.type === 'overlap' && conflict.affectedClips.length === 2) {
      const [firstId, secondId] = conflict.affectedClips;
      const firstClip = fixedClips.find((c) => c.id === firstId);
      const secondClip = fixedClips.find((c) => c.id === secondId);

      if (firstClip && secondClip) {
        // 将第二个clip移动到第一个clip结束后
        secondClip.startTime = firstClip.startTime + firstClip.duration;
      }
    }
  });

  return fixedClips;
}
