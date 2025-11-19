import React from 'react';
import './TimelineRuler.css';

interface TimelineRulerProps {
  duration: number; // Total duration in seconds
  pixelsPerSecond: number;
  width: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  duration,
  pixelsPerSecond,
  width,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const renderTicks = () => {
    const ticks = [];
    const interval = pixelsPerSecond >= 50 ? 1 : pixelsPerSecond >= 20 ? 2 : 5; // Adaptive interval

    for (let i = 0; i <= duration; i += interval) {
      const left = i * pixelsPerSecond;
      const isMajor = i % 5 === 0;

      ticks.push(
        <div
          key={i}
          className={`timeline-tick ${isMajor ? 'major' : 'minor'}`}
          style={{ left: `${left}px` }}
        >
          {isMajor && <span className="timeline-tick-label">{formatTime(i)}</span>}
        </div>
      );
    }

    return ticks;
  };

  return (
    <div className="timeline-ruler" style={{ width: `${width}px` }}>
      {renderTicks()}
    </div>
  );
};
