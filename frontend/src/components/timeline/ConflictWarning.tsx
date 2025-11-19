import React from 'react';
import { ConflictInfo } from '../../utils/timelineConflictDetector';
import './ConflictWarning.css';

interface ConflictWarningProps {
  conflicts: ConflictInfo[];
  onFixConflict?: (conflict: ConflictInfo) => void;
  onDismiss?: () => void;
}

export const ConflictWarning: React.FC<ConflictWarningProps> = ({
  conflicts,
  onFixConflict,
  onDismiss,
}) => {
  if (conflicts.length === 0) return null;

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'error':
        return '#d32f2f';
      case 'warning':
        return '#f57c00';
      case 'info':
        return '#1976d2';
      default:
        return '#666';
    }
  };

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;
  const infoCount = conflicts.filter((c) => c.severity === 'info').length;

  return (
    <div className="conflict-warning-panel">
      <div className="panel-header">
        <div className="header-title">
          <span className="title-icon">🔍</span>
          <span className="title-text">时间线问题检测</span>
        </div>
        <div className="header-summary">
          {errorCount > 0 && <span className="count error">{errorCount} 错误</span>}
          {warningCount > 0 && <span className="count warning">{warningCount} 警告</span>}
          {infoCount > 0 && <span className="count info">{infoCount} 提示</span>}
        </div>
        {onDismiss && (
          <button className="dismiss-btn" onClick={onDismiss}>
            ×
          </button>
        )}
      </div>

      <div className="conflicts-list">
        {conflicts.map((conflict, index) => (
          <div
            key={index}
            className={`conflict-item severity-${conflict.severity}`}
            style={{ borderLeftColor: getSeverityColor(conflict.severity) }}
          >
            <div className="conflict-header">
              <span className="severity-icon">{getSeverityIcon(conflict.severity)}</span>
              <span className="conflict-type">{getTypeLabel(conflict.type)}</span>
            </div>
            <div className="conflict-message">{conflict.message}</div>
            {conflict.suggestedFix && (
              <div className="conflict-fix">
                <span className="fix-label">建议:</span>
                <span className="fix-text">{conflict.suggestedFix}</span>
                {onFixConflict && (
                  <button
                    className="fix-btn"
                    onClick={() => onFixConflict(conflict)}
                  >
                    自动修复
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    order: '顺序冲突',
    overlap: '重叠',
    gap: '间隙',
  };
  return labels[type] || type;
}
