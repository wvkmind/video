import React from 'react';
import './StatusFilter.css';

interface StatusFilterProps {
  currentFilter: string;
  onFilterChange: (status: string) => void;
  type: 'entity' | 'project' | 'generation';
  className?: string;
}

const ENTITY_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'generated', label: '已生成' },
  { value: 'locked', label: '已锁定' },
];

const PROJECT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
];

const GENERATION_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '等待中' },
  { value: 'processing', label: '生成中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

export const StatusFilter: React.FC<StatusFilterProps> = ({
  currentFilter,
  onFilterChange,
  type,
  className = '',
}) => {
  let options = ENTITY_STATUS_OPTIONS;
  if (type === 'project') {
    options = PROJECT_STATUS_OPTIONS;
  } else if (type === 'generation') {
    options = GENERATION_STATUS_OPTIONS;
  }

  return (
    <div className={`status-filter ${className}`}>
      <label htmlFor="status-filter-select">状态筛选：</label>
      <select
        id="status-filter-select"
        value={currentFilter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="status-filter-select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StatusFilter;
