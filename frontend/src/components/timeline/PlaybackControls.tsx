import React from 'react';
import './PlaybackControls.css';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onFrameStep: (direction: 'forward' | 'backward') => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onFrameStep,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.25, 0.5, 1, 1.5, 2];

  return (
    <div className="playback-controls">
      <div className="controls-left">
        <button
          className="control-btn"
          onClick={() => onFrameStep('backward')}
          title="后退一帧"
        >
          ⏮
        </button>
        
        {isPlaying ? (
          <button className="control-btn play-btn" onClick={onPause} title="暂停">
            ⏸
          </button>
        ) : (
          <button className="control-btn play-btn" onClick={onPlay} title="播放">
            ▶
          </button>
        )}
        
        <button className="control-btn" onClick={onStop} title="停止">
          ⏹
        </button>
        
        <button
          className="control-btn"
          onClick={() => onFrameStep('forward')}
          title="前进一帧"
        >
          ⏭
        </button>
      </div>

      <div className="controls-center">
        <span className="time-display">{formatTime(currentTime)}</span>
        <span className="time-separator">/</span>
        <span className="time-display">{formatTime(duration)}</span>
      </div>

      <div className="controls-right">
        <label className="speed-label">速度:</label>
        <select
          className="speed-select"
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
        >
          {speedOptions.map((speed) => (
            <option key={speed} value={speed}>
              {speed}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
