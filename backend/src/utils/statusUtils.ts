/**
 * Entity status types and utilities
 */

export type EntityStatus = 'draft' | 'generated' | 'locked';
export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'archived';
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Valid status transitions for entities
 */
const ENTITY_STATUS_TRANSITIONS: Record<EntityStatus, EntityStatus[]> = {
  draft: ['generated', 'locked'],
  generated: ['draft', 'locked'],
  locked: ['draft'], // Can unlock back to draft
};

const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['in_progress', 'archived'],
  in_progress: ['completed', 'draft', 'archived'],
  completed: ['archived', 'in_progress'],
  archived: ['draft'], // Can restore from archive
};

/**
 * Validates if a status transition is allowed
 */
export function isValidEntityStatusTransition(
  currentStatus: EntityStatus,
  newStatus: EntityStatus
): boolean {
  if (currentStatus === newStatus) {
    return true;
  }
  return ENTITY_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Validates if a project status transition is allowed
 */
export function isValidProjectStatusTransition(
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus
): boolean {
  if (currentStatus === newStatus) {
    return true;
  }
  return PROJECT_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Validates entity status value
 */
export function isValidEntityStatus(status: string): status is EntityStatus {
  return ['draft', 'generated', 'locked'].includes(status);
}

/**
 * Validates project status value
 */
export function isValidProjectStatus(status: string): status is ProjectStatus {
  return ['draft', 'in_progress', 'completed', 'archived'].includes(status);
}

/**
 * Validates generation status value
 */
export function isValidGenerationStatus(status: string): status is GenerationStatus {
  return ['pending', 'processing', 'completed', 'failed'].includes(status);
}

/**
 * Get human-readable status label (Chinese)
 */
export function getEntityStatusLabel(status: EntityStatus): string {
  const labels: Record<EntityStatus, string> = {
    draft: '草稿',
    generated: '已生成',
    locked: '已锁定',
  };
  return labels[status] || status;
}

/**
 * Get human-readable project status label (Chinese)
 */
export function getProjectStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    draft: '草稿',
    in_progress: '进行中',
    completed: '已完成',
    archived: '已归档',
  };
  return labels[status] || status;
}

/**
 * Get human-readable generation status label (Chinese)
 */
export function getGenerationStatusLabel(status: GenerationStatus): string {
  const labels: Record<GenerationStatus, string> = {
    pending: '等待中',
    processing: '生成中',
    completed: '已完成',
    failed: '失败',
  };
  return labels[status] || status;
}

/**
 * Get CSS class for status badge
 */
export function getStatusBadgeClass(status: EntityStatus | ProjectStatus | GenerationStatus): string {
  const classMap: Record<string, string> = {
    draft: 'status-draft',
    generated: 'status-generated',
    locked: 'status-locked',
    in_progress: 'status-in-progress',
    completed: 'status-completed',
    archived: 'status-archived',
    pending: 'status-pending',
    processing: 'status-processing',
    failed: 'status-failed',
  };
  return classMap[status] || 'status-default';
}
