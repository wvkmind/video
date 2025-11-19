import React from 'react';
import './TimelinePlayhead.css';

interface TimelinePlayheadProps {
  currentTime: number; // Current time in seconds
  pixelsPerSecond: number;
  height: number;
  onSeek?: (time: number) => void;
}

export const TimelinePlayhead: React.FC<TimelinePlayheadProps> = ({
  currentTime,
  pixelsPerSecond,
  height,
  onSeek,
}) => {
  const left = currentTime * pixelsPerSecond;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onSeek) return;

    const startX = e.clientX;
    const startLeft = left;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newLeft = Math.max(0, startLeft + deltaX);
      const newTime = newLeft / pixelsPerSecond;
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="timeline-playhead"
      style={{ left: `${left}px`, height: `${height}px` }}
      onMouseDown={handleMouseDown}
    >
      <div className="playhead-handle" />
      <div className="playhead-line" />
    </div>
  );
};
