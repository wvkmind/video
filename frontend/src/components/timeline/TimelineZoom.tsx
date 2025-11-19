import React from 'react';
import './TimelineZoom.css';

interface TimelineZoomProps {
  zoom: number; // pixels per second
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToWindow: () => void;
}

export const TimelineZoom: React.FC<TimelineZoomProps> = ({
  zoom,
  minZoom,
  maxZoom,
  onZoomChange,
  onFitToWindow,
}) => {
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.5, maxZoom);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.5, minZoom);
    onZoomChange(newZoom);
  };

  const zoomPercentage = Math.round((zoom / maxZoom) * 100);

  return (
    <div className="timeline-zoom">
      <button
        className="zoom-btn"
        onClick={handleZoomOut}
        disabled={zoom <= minZoom}
        title="缩小"
      >
        −
      </button>
      
      <input
        type="range"
        className="zoom-slider"
        min={minZoom}
        max={maxZoom}
        step={(maxZoom - minZoom) / 100}
        value={zoom}
        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
      />
      
      <span className="zoom-percentage">{zoomPercentage}%</span>
      
      <button
        className="zoom-btn"
        onClick={handleZoomIn}
        disabled={zoom >= maxZoom}
        title="放大"
      >
        +
      </button>
      
      <button
        className="zoom-btn fit-btn"
        onClick={onFitToWindow}
        title="适应窗口"
      >
        ⊡
      </button>
    </div>
  );
};
