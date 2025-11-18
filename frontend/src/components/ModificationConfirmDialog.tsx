import React, { useState, useEffect } from 'react';
import './ModificationConfirmDialog.css';

interface DependentEntity {
  entityType: 'story' | 'scene' | 'shot' | 'keyframe' | 'clip';
  entityId: string;
  entityName: string;
  status: string;
}

interface ImpactAnalysis {
  directDependents: DependentEntity[];
  indirectDependents: DependentEntity[];
  totalAffected: number;
}

interface ModificationConfirmDialogProps {
  isOpen: boolean;
  entityType: 'story' | 'scene' | 'shot' | 'keyframe';
  entityId: string;
  entityName: string;
  onConfirm: (refreshDownstream: boolean) => void;
  onCancel: () => void;
}

export const ModificationConfirmDialog: React.FC<ModificationConfirmDialogProps> = ({
  isOpen,
  entityType,
  entityId,
  entityName,
  onConfirm,
  onCancel
}) => {
  const [impact, setImpact] = useState<ImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshDownstream, setRefreshDownstream] = useState(false);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchImpact();
    }
  }, [isOpen, entityId]);

  const fetchImpact = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dependencies/${entityType}/${entityId}/impact`);
      if (response.ok) {
        const data = await response.json();
        setImpact(data);
      }
    } catch (error) {
      console.error('Failed to fetch impact analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      story: '故事',
      scene: '场景',
      shot: '镜头',
      keyframe: '关键帧',
      clip: '视频片段'
    };
    return labels[type] || type;
  };

  if (!isOpen) return null;

  return (
    <div className="modification-confirm-overlay">
      <div className="modification-confirm-dialog">
        <div className="dialog-header">
          <h2>确认修改</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="dialog-content">
          <div className="warning-message">
            <span className="warning-icon">⚠️</span>
            <p>您即将修改 <strong>{getEntityTypeLabel(entityType)}: {entityName}</strong></p>
          </div>

          {loading ? (
            <div className="loading">正在分析影响范围...</div>
          ) : impact && impact.totalAffected > 0 ? (
            <div className="impact-preview">
              <h3>影响范围预览</h3>
              <div className="impact-summary">
                <p>此修改将影响 <strong>{impact.totalAffected}</strong> 个下游产物</p>
              </div>

              {impact.directDependents.length > 0 && (
                <div className="dependents-section">
                  <h4>直接依赖 ({impact.directDependents.length})</h4>
                  <ul className="dependents-list">
                    {impact.directDependents.map((dep) => (
                      <li key={dep.entityId} className="dependent-item">
                        <span className="entity-type">{getEntityTypeLabel(dep.entityType)}</span>
                        <span className="entity-name">{dep.entityName}</span>
                        <span className={`entity-status status-${dep.status}`}>{dep.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {impact.indirectDependents.length > 0 && (
                <div className="dependents-section">
                  <h4>间接依赖 ({impact.indirectDependents.length})</h4>
                  <ul className="dependents-list">
                    {impact.indirectDependents.slice(0, 5).map((dep) => (
                      <li key={dep.entityId} className="dependent-item">
                        <span className="entity-type">{getEntityTypeLabel(dep.entityType)}</span>
                        <span className="entity-name">{dep.entityName}</span>
                        <span className={`entity-status status-${dep.status}`}>{dep.status}</span>
                      </li>
                    ))}
                    {impact.indirectDependents.length > 5 && (
                      <li className="more-items">
                        还有 {impact.indirectDependents.length - 5} 个...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="refresh-option">
                <label>
                  <input
                    type="checkbox"
                    checked={refreshDownstream}
                    onChange={(e) => setRefreshDownstream(e.target.checked)}
                  />
                  <span>批量刷新下层产物（重新生成受影响的内容）</span>
                </label>
                <p className="option-hint">
                  {refreshDownstream 
                    ? '⚠️ 将自动重新生成所有受影响的下游产物，这可能需要较长时间'
                    : 'ℹ️ 下游产物将保持不变，您可以稍后手动更新'}
                </p>
              </div>
            </div>
          ) : (
            <div className="no-impact">
              <p>此修改不会影响任何下游产物</p>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => onConfirm(refreshDownstream)}
            disabled={loading}
          >
            确认修改
          </button>
        </div>
      </div>
    </div>
  );
};
