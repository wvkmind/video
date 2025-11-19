import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import './TimelineTrack.css';

export interface TimelineClip {
  id: string;
  startTime: number;
  duration: number;
  label: string;
  color?: string;
  thumbnailUrl?: string;
}

interface TimelineTrackProps {
  trackType: 'video' | 'audio';
  clips: TimelineClip[];
  pixelsPerSecond: number;
  onClipClick?: (clip: TimelineClip) => void;
  onClipMove?: (clipId: string, newStartTime: number) => void;
  onClipReorder?: (draggedId: string, targetId: string) => void;
}

const ClipBlock: React.FC<{
  clip: TimelineClip;
  pixelsPerSecond: number;
  onClick?: () => void;
  onMove?: (newStartTime: number) => void;
  onReorder?: (targetId: string) => void;
}> = ({ clip, pixelsPerSecond, onClick, onMove, onReorder }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'TIMELINE_CLIP',
    item: { id: clip.id, startTime: clip.startTime },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'TIMELINE_CLIP',
    drop: (item: { id: string; startTime: number }) => {
      if (item.id !== clip.id && onReorder) {
        onReorder(item.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const left = clip.startTime * pixelsPerSecond;
  const width = clip.duration * pixelsPerSecond;

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`timeline-clip ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''}`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: clip.color || '#4a90e2',
      }}
      onClick={onClick}
    >
      {clip.thumbnailUrl && (
        <img src={clip.thumbnailUrl} alt="" className="clip-thumbnail" />
      )}
      <div className="clip-label">{clip.label}</div>
      <div className="clip-duration">{clip.duration.toFixed(1)}s</div>
    </div>
  );
};

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  trackType,
  clips,
  pixelsPerSecond,
  onClipClick,
  onClipMove,
  onClipReorder,
}) => {
  return (
    <div className={`timeline-track timeline-track-${trackType}`}>
      <div className="track-label">{trackType === 'video' ? '视频' : '音频'}</div>
      <div className="track-content">
        {clips.map((clip) => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            pixelsPerSecond={pixelsPerSecond}
            onClick={() => onClipClick?.(clip)}
            onMove={(newStartTime) => onClipMove?.(clip.id, newStartTime)}
            onReorder={(targetId) => onClipReorder?.(clip.id, targetId)}
          />
        ))}
      </div>
    </div>
  );
};
