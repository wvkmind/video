import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import './AudioWaveform.css';

interface AudioWaveformProps {
  audioUrl: string;
  pixelsPerSecond: number;
  currentTime?: number;
  onReady?: (duration: number) => void;
  onSeek?: (time: number) => void;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioUrl,
  pixelsPerSecond,
  currentTime = 0,
  onReady,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4a90e2',
      progressColor: '#357abd',
      cursorColor: '#ff4444',
      barWidth: 2,
      barGap: 1,
      height: 50,
      normalize: true,
      backend: 'WebAudio',
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    wavesurfer.load(audioUrl);

    // Event listeners
    wavesurfer.on('ready', () => {
      const duration = wavesurfer.getDuration();
      if (onReady) {
        onReady(duration);
      }
    });

    wavesurfer.on('seek', (progress) => {
      if (onSeek) {
        const time = progress * wavesurfer.getDuration();
        onSeek(time);
      }
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl]);

  // Update playback position
  useEffect(() => {
    if (wavesurferRef.current && currentTime !== undefined) {
      const duration = wavesurferRef.current.getDuration();
      if (duration > 0) {
        wavesurferRef.current.seekTo(currentTime / duration);
      }
    }
  }, [currentTime]);

  return (
    <div className="audio-waveform">
      <div ref={containerRef} className="waveform-container" />
    </div>
  );
};
