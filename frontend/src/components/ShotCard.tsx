import React, { memo } from 'react';
import { Shot } from '../services/api';
import StatusSelector from './StatusSelector';
import './ShotCard.css';

interface ShotCardProps {
  shot: Shot;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (shotId: string) => void;
  onEdit: (shot: Shot) => void;
  onDelete: (shotId: string) => void;
  onStatusChange: (shotId: string, status: string) => void;
  onDragStart: (shot: Shot) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (shot: Shot) => void;
  showTransition?: boolean;
  transitionType?: string;
  useLastFrameAsFirst?: boolean;
}

/**
 * Optimized shot card component with React.memo
 * Only re-renders when props actually change
 */
const ShotCard: React.FC<ShotCardProps> = memo(({
  shot,
  isSelected,
  isDragging,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragOver,
  onDrop,
  showTransition = false,
  transitionType = 'cut',
  useLastFrameAsFirst = false,
}) => {
  const getShotTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      wide: '远景',
      medium: '中景',
      closeup: '特写',
      transition: '过渡',
    };
    return labels[type] || type;
  };

  const getTransitionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cut: '切',
      dissolve: '溶',
      motion: '动态',
    };
    return labels[type] || type;
  };

  const getImportanceClass = (importance?: string) => {
    return `importance-${importance || 'medium'}`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {showTransition && (
        <div className="transition-indicator">
          <span className="transition-line" />
          <span className={`transition-label ${useLastFrameAsFirst ? 'seamless' : ''}`}>
            <span className="transition-icon">
              {transitionType === 'cut' && '✂️'}
              {transitionType === 'dissolve' && '🌊'}
              {transitionType === 'motion' && '➡️'}
            </span>
            {getTransitionTypeLabel(transitionType)}
            {useLastFrameAsFirst && (
              <span className="seamless-badge" title="使用尾帧衔接">
                🔗 无缝衔接
              </span>
            )}
          </span>
          <span className="transition-line" />
        </div>
      )}

      <div
        className={`shot-card ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        draggable
        onDragStart={() => onDragStart(shot)}
        onDragOver={onDragOver}
        onDrop={() => onDrop(shot)}
      >
        <div className="shot-header">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(shot.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="shot-title">
            <h3>{shot.shotId}</h3>
            <span className={`shot-type ${shot.shotType}`}>
              {getShotTypeLabel(shot.shotType)}
            </span>
            <span className={`importance-badge ${getImportanceClass(shot.importance)}`}>
              {shot.importance === 'high' ? '重要' : shot.importance === 'low' ? '次要' : '一般'}
            </span>
            <StatusSelector
              currentStatus={shot.status || 'draft'}
              type="entity"
              onStatusChange={(newStatus) => onStatusChange(shot.id, newStatus)}
            />
          </div>
          <div className="shot-actions">
            <button onClick={() => onEdit(shot)} className="btn-small">
              编辑
            </button>
            <button
              onClick={() => onDelete(shot.id)}
              className="btn-small btn-danger"
            >
              删除
            </button>
          </div>
        </div>

        <div className="shot-body">
          <div className="shot-info">
            <span>时长: {formatDuration(shot.duration)}</span>
            <span>顺序: #{shot.sequenceNumber}</span>
            {shot.previousShotId && (
              <span className="connection-badge" title="与上一镜头衔接">
                🔗 衔接
              </span>
            )}
          </div>

          {shot.description && (
            <p className="shot-description">{shot.description}</p>
          )}

          <div className="shot-details">
            {shot.environment && (
              <div className="detail-item">
                <strong>环境:</strong> {shot.environment}
              </div>
            )}
            {shot.subject && (
              <div className="detail-item">
                <strong>主体:</strong> {shot.subject}
              </div>
            )}
            {shot.action && (
              <div className="detail-item">
                <strong>动作:</strong> {shot.action}
              </div>
            )}
            {shot.cameraMovement && (
              <div className="detail-item">
                <strong>镜头运动:</strong> {shot.cameraMovement}
              </div>
            )}
            {shot.lighting && (
              <div className="detail-item">
                <strong>光线:</strong> {shot.lighting}
              </div>
            )}
            {shot.style && (
              <div className="detail-item">
                <strong>风格:</strong> {shot.style}
              </div>
            )}
            {shot.relatedVoiceover && (
              <div className="detail-item voiceover">
                <strong>旁白:</strong> {shot.relatedVoiceover}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.shot.id === nextProps.shot.id &&
    prevProps.shot.status === nextProps.shot.status &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.showTransition === nextProps.showTransition
  );
});

ShotCard.displayName = 'ShotCard';

export default ShotCard;
