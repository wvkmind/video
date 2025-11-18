import React, { useState } from 'react';
import { EntityStatus, ProjectStatus } from './StatusBadge';
import './StatusSelector.css';

interface StatusSelectorProps {
  currentStatus: EntityStatus | ProjectStatus;
  type: 'entity' | 'project';
  onStatusChange: (newStatus: string) => Promise<void>;
  disabled?: boolean;
}

const ENTITY_STATUS_OPTIONS: { value: EntityStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'generated', label: '已生成' },
  { value: 'locked', label: '已锁定' },
];

const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
];

const ENTITY_STATUS_TRANSITIONS: Record<EntityStatus, EntityStatus[]> = {
  draft: ['generated', 'locked'],
  generated: ['draft', 'locked'],
  locked: ['draft'],
};

const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['in_progress', 'archived'],
  in_progress: ['completed', 'draft', 'archived'],
  completed: ['archived', 'in_progress'],
  archived: ['draft'],
};

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  type,
  onStatusChange,
  disabled = false,
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const options = type === 'entity' ? ENTITY_STATUS_OPTIONS : PROJECT_STATUS_OPTIONS;
  const validTransitions =
    type === 'entity'
      ? ENTITY_STATUS_TRANSITIONS[currentStatus as EntityStatus] || []
      : PROJECT_STATUS_TRANSITIONS[currentStatus as ProjectStatus] || [];

  const availableOptions = options.filter(
    (opt) => opt.value === currentStatus || validTransitions.includes(opt.value as any)
  );

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || isChanging) return;

    setIsChanging(true);
    setShowDropdown(false);

    try {
      await onStatusChange(newStatus);
    } catch (error) {
      console.error('Failed to change status:', error);
      alert('状态更新失败，请重试');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="status-selector">
      <button
        className="status-selector-button"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || isChanging}
      >
        {options.find((opt) => opt.value === currentStatus)?.label || currentStatus}
        <span className="dropdown-arrow">▼</span>
      </button>

      {showDropdown && (
        <>
          <div className="status-selector-backdrop" onClick={() => setShowDropdown(false)} />
          <div className="status-selector-dropdown">
            {availableOptions.map((option) => (
              <button
                key={option.value}
                className={`status-option ${option.value === currentStatus ? 'current' : ''}`}
                onClick={() => handleStatusChange(option.value)}
                disabled={option.value === currentStatus}
              >
                {option.label}
                {option.value === currentStatus && <span className="check-mark">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {isChanging && <div className="status-changing-indicator">更新中...</div>}
    </div>
  );
};

export default StatusSelector;
