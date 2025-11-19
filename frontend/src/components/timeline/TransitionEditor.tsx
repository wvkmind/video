import React, { useState } from 'react';
import './TransitionEditor.css';

export type TransitionType = 'cut' | 'dissolve' | 'fade' | 'wipe' | 'slide';

export interface Transition {
  id: string;
  fromClipId: string;
  toClipId: string;
  type: TransitionType;
  duration: number; // in seconds
  position: number; // time position in timeline
}

interface TransitionEditorProps {
  transition: Transition | null;
  onSave: (transition: Transition) => void;
  onDelete?: (transitionId: string) => void;
  onClose: () => void;
}

export const TransitionEditor: React.FC<TransitionEditorProps> = ({
  transition,
  onSave,
  onDelete,
  onClose,
}) => {
  const [type, setType] = useState<TransitionType>(transition?.type || 'cut');
  const [duration, setDuration] = useState(transition?.duration || 0.5);

  const transitionTypes: { value: TransitionType; label: string; description: string }[] = [
    { value: 'cut', label: '硬切', description: '直接切换，无过渡' },
    { value: 'dissolve', label: '溶解', description: '画面逐渐融合' },
    { value: 'fade', label: '淡入淡出', description: '通过黑场过渡' },
    { value: 'wipe', label: '擦除', description: '一个画面擦除另一个' },
    { value: 'slide', label: '滑动', description: '画面滑动切换' },
  ];

  const handleSave = () => {
    if (!transition) return;

    onSave({
      ...transition,
      type,
      duration: type === 'cut' ? 0 : duration,
    });
    onClose();
  };

  const handleDelete = () => {
    if (transition && onDelete) {
      if (confirm('确定要删除这个转场吗？')) {
        onDelete(transition.id);
        onClose();
      }
    }
  };

  return (
    <div className="transition-editor-overlay" onClick={onClose}>
      <div className="transition-editor" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h3>{transition ? '编辑转场' : '添加转场'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="editor-content">
          <div className="form-group">
            <label>转场类型</label>
            <div className="transition-types">
              {transitionTypes.map((t) => (
                <div
                  key={t.value}
                  className={`transition-type-card ${type === t.value ? 'selected' : ''}`}
                  onClick={() => setType(t.value)}
                >
                  <div className="type-label">{t.label}</div>
                  <div className="type-description">{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          {type !== 'cut' && (
            <div className="form-group">
              <label>转场时长（秒）</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                min="0.1"
                max="3"
                step="0.1"
              />
              <input
                type="range"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                min="0.1"
                max="3"
                step="0.1"
                className="duration-slider"
              />
            </div>
          )}

          <div className="preview-section">
            <div className="preview-label">预览效果</div>
            <div className="transition-preview">
              <div className="preview-clip">Clip A</div>
              <div className={`preview-transition transition-${type}`}>
                {type !== 'cut' && <span>{duration}s</span>}
              </div>
              <div className="preview-clip">Clip B</div>
            </div>
          </div>
        </div>

        <div className="editor-footer">
          {transition && onDelete && (
            <button className="btn-danger" onClick={handleDelete}>
              删除转场
            </button>
          )}
          <div className="footer-actions">
            <button className="btn-secondary" onClick={onClose}>取消</button>
            <button className="btn-primary" onClick={handleSave}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Transition Marker Component (显示在时间线上)
interface TransitionMarkerProps {
  transition: Transition;
  pixelsPerSecond: number;
  onClick: () => void;
}

export const TransitionMarker: React.FC<TransitionMarkerProps> = ({
  transition,
  pixelsPerSecond,
  onClick,
}) => {
  const left = transition.position * pixelsPerSecond;
  const width = transition.duration * pixelsPerSecond;

  const getIcon = (type: TransitionType): string => {
    const icons: Record<TransitionType, string> = {
      cut: '✂️',
      dissolve: '🌊',
      fade: '🌑',
      wipe: '➡️',
      slide: '↔️',
    };
    return icons[type];
  };

  return (
    <div
      className={`transition-marker transition-${transition.type}`}
      style={{ left: `${left}px`, width: width > 0 ? `${width}px` : '2px' }}
      onClick={onClick}
      title={`${transition.type} - ${transition.duration}s`}
    >
      <span className="transition-icon">{getIcon(transition.type)}</span>
    </div>
  );
};
