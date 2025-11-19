import React, { useState } from 'react';
import './ClipTrimmer.css';

interface ClipTrimmerProps {
  clipId: string;
  clipName: string;
  inPoint: number; // in seconds
  outPoint: number; // in seconds
  maxDuration: number;
  onUpdate: (clipId: string, inPoint: number, outPoint: number) => void;
  onClose: () => void;
}

export const ClipTrimmer: React.FC<ClipTrimmerProps> = ({
  clipId,
  clipName,
  inPoint,
  outPoint,
  maxDuration,
  onUpdate,
  onClose,
}) => {
  const [localInPoint, setLocalInPoint] = useState(inPoint);
  const [localOutPoint, setLocalOutPoint] = useState(outPoint);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 60 + parts[1] + parts[2] / 30;
    }
    return 0;
  };

  const handleInPointChange = (value: number) => {
    const newInPoint = Math.max(0, Math.min(value, localOutPoint - 0.1));
    setLocalInPoint(newInPoint);
  };

  const handleOutPointChange = (value: number) => {
    const newOutPoint = Math.max(localInPoint + 0.1, Math.min(value, maxDuration));
    setLocalOutPoint(newOutPoint);
  };

  const handleSave = () => {
    onUpdate(clipId, localInPoint, localOutPoint);
    onClose();
  };

  const duration = localOutPoint - localInPoint;

  return (
    <div className="clip-trimmer-overlay" onClick={onClose}>
      <div className="clip-trimmer" onClick={(e) => e.stopPropagation()}>
        <div className="trimmer-header">
          <h3>精确调整 - {clipName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="trimmer-content">
          <div className="trimmer-info">
            <div className="info-item">
              <label>时长:</label>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="trimmer-controls">
            <div className="control-group">
              <label>入点 (IN)</label>
              <input
                type="number"
                value={localInPoint.toFixed(2)}
                onChange={(e) => handleInPointChange(parseFloat(e.target.value))}
                step="0.033"
                min="0"
                max={localOutPoint - 0.1}
              />
              <span className="time-display">{formatTime(localInPoint)}</span>
              <div className="frame-controls">
                <button onClick={() => handleInPointChange(localInPoint - 1 / 30)}>-1帧</button>
                <button onClick={() => handleInPointChange(localInPoint + 1 / 30)}>+1帧</button>
              </div>
            </div>

            <div className="control-group">
              <label>出点 (OUT)</label>
              <input
                type="number"
                value={localOutPoint.toFixed(2)}
                onChange={(e) => handleOutPointChange(parseFloat(e.target.value))}
                step="0.033"
                min={localInPoint + 0.1}
                max={maxDuration}
              />
              <span className="time-display">{formatTime(localOutPoint)}</span>
              <div className="frame-controls">
                <button onClick={() => handleOutPointChange(localOutPoint - 1 / 30)}>-1帧</button>
                <button onClick={() => handleOutPointChange(localOutPoint + 1 / 30)}>+1帧</button>
              </div>
            </div>
          </div>

          <div className="trimmer-slider">
            <input
              type="range"
              min="0"
              max={maxDuration}
              step="0.033"
              value={localInPoint}
              onChange={(e) => handleInPointChange(parseFloat(e.target.value))}
              className="in-slider"
            />
            <input
              type="range"
              min="0"
              max={maxDuration}
              step="0.033"
              value={localOutPoint}
              onChange={(e) => handleOutPointChange(parseFloat(e.target.value))}
              className="out-slider"
            />
          </div>
        </div>

        <div className="trimmer-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave}>应用</button>
        </div>
      </div>
    </div>
  );
};
