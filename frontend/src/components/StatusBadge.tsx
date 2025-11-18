import React from 'react';
import './StatusBadge.css';

export type EntityStatus = 'draft' | 'generated' | 'locked';
export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'archived';
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface StatusBadgeProps {
  status: EntityStatus | ProjectStatus | GenerationStatus;
  onClick?: () => void;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  // Entity status
  draft: '草稿',
  generated: '已生成',
  locked: '已锁定',
  // Project status
  in_progress: '进行中',
  completed: '已完成',
  archived: '已归档',
  // Generation status
  pending: '等待中',
  processing: '生成中',
  failed: '失败',
};

const STATUS_CLASSES: Record<string, string> = {
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

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  onClick,
  className = '',
}) => {
  const label = STATUS_LABELS[status] || status;
  const statusClass = STATUS_CLASSES[status] || 'status-default';

  return (
    <span
      className={`status-badge ${statusClass} ${onClick ? 'clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
