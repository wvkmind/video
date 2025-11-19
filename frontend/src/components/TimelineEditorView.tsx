import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { api, clipApi, shotApi, Shot, Clip, FrameMismatchResult } from '../services/api';
import { TimelineRuler } from './timeline/TimelineRuler';
import { TimelinePlayhead } from './timeline/TimelinePlayhead';
import { TimelineTrack, TimelineClip as TrackClip } from './timeline/TimelineTrack';
import { ClipTrimmer } from './timeline/ClipTrimmer';
import { TransitionEditor, TransitionMarker, Transition } from './timeline/TransitionEditor';
import { PlaybackControls } from './timeline/PlaybackControls';
import { TimelineZoom } from './timeline/TimelineZoom';
import { ConflictWarning } from './timeline/ConflictWarning';
import { AudioImporter } from './timeline/AudioImporter';
import { detectAllConflicts, autoFixConflicts, ConflictInfo } from '../utils/timelineConflictDetector';
import './TimelineEditorView.css';

interface TimelineClip {
  id: string;
  clipId: number;
  startTime: number;
  endTime: number;
  inPoint: number;
  outPoint: number;
  transitionOut?: string;
}

interface TimelineTrack {
  id: string;
  type: 'video' | 'audio';
  clips: TimelineClip[];
}

interface Timeline {
  id: number;
  projectId: string;
  version: number;
  versionName?: string;
  tracks: TimelineTrack[];
  voiceoverAudioPath?: string;
  bgmAudioPath?: string;
}

interface TransitionPoint {
  clip1: Clip;
  clip2: Clip;
  shot1: Shot;
  shot2: Shot;
  position: number;
}

export const TimelineEditorView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [versions, setVersions] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  
  // Transition preview state - for future frame mismatch detection
  const [, setShots] = useState<Shot[]>([]);
  const [, setClips] = useState<Map<string, Clip[]>>(new Map());
  const [transitionPoints, setTransitionPoints] = useState<TransitionPoint[]>([]);
  const [selectedTransition, setSelectedTransition] = useState<TransitionPoint | null>(null);
  const [mismatchResults, setMismatchResults] = useState<Map<string, FrameMismatchResult>>(new Map());
  const [checkingMismatch, setCheckingMismatch] = useState(false);

  // New timeline editor state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [zoom, setZoom] = useState(50); // pixels per second
  const [selectedClip, setSelectedClip] = useState<TrackClip | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [editingTransition, setEditingTransition] = useState<Transition | null>(null);
  const [showTransitionEditor, setShowTransitionEditor] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflicts, setShowConflicts] = useState(true);
  
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const playbackIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (projectId) {
      loadTimeline();
      loadVersions();
      loadShotsAndClips();
    }
  }, [projectId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/${projectId}/timeline`);
      setTimeline(response.data);
    } catch (error) {
      console.error('Failed to load timeline:', error);
      // 如果没有时间线，创建一个空的
      setTimeline({
        id: 0,
        projectId: projectId!,
        version: 1,
        tracks: [
          { id: 'video-1', type: 'video', clips: [] },
          { id: 'audio-1', type: 'audio', clips: [] },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/timeline/versions`);
      setVersions(response.data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const loadShotsAndClips = async () => {
    if (!projectId) return;

    try {
      // Load all shots
      const shotsResponse = await shotApi.list(projectId);
      const shotsData = shotsResponse.data;
      setShots(shotsData);

      // Load clips for each shot
      const clipsMap = new Map<string, Clip[]>();
      for (const shot of shotsData) {
        try {
          const clipsResponse = await clipApi.list(shot.id);
          clipsMap.set(shot.id, clipsResponse.data);
        } catch (error) {
          console.error(`Failed to load clips for shot ${shot.id}:`, error);
          clipsMap.set(shot.id, []);
        }
      }
      setClips(clipsMap);

      // Detect transition points
      detectTransitionPoints(shotsData, clipsMap);
    } catch (error) {
      console.error('Failed to load shots and clips:', error);
    }
  };

  const detectTransitionPoints = (shotsData: Shot[], clipsMap: Map<string, Clip[]>) => {
    const points: TransitionPoint[] = [];
    let currentPosition = 0;

    // Sort shots by sequence number
    const sortedShots = [...shotsData].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    for (let i = 0; i < sortedShots.length - 1; i++) {
      const shot1 = sortedShots[i];
      const shot2 = sortedShots[i + 1];

      // Check if there's a transition relationship
      if (shot2.previousShotId === shot1.id) {
        const clips1 = clipsMap.get(shot1.id) || [];
        const clips2 = clipsMap.get(shot2.id) || [];

        const selectedClip1 = clips1.find(c => c.isSelected);
        const selectedClip2 = clips2.find(c => c.isSelected);

        if (selectedClip1 && selectedClip2) {
          currentPosition += selectedClip1.duration;
          points.push({
            clip1: selectedClip1,
            clip2: selectedClip2,
            shot1,
            shot2,
            position: currentPosition,
          });
        }
      } else {
        // No transition, just add duration
        const clips1 = clipsMap.get(shot1.id) || [];
        const selectedClip1 = clips1.find(c => c.isSelected);
        if (selectedClip1) {
          currentPosition += selectedClip1.duration;
        }
      }
    }

    setTransitionPoints(points);
  };

  const checkFrameMismatch = async (transitionPoint: TransitionPoint) => {
    setCheckingMismatch(true);
    try {
      const result = await clipApi.detectMismatch(
        transitionPoint.clip1.id,
        transitionPoint.clip2.id
      );
      
      const key = `${transitionPoint.clip1.id}-${transitionPoint.clip2.id}`;
      setMismatchResults(prev => new Map(prev).set(key, result.data));
    } catch (error: any) {
      console.error('Failed to check frame mismatch:', error);
      alert(`检测失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setCheckingMismatch(false);
    }
  };

  const getMismatchResult = (transitionPoint: TransitionPoint): FrameMismatchResult | undefined => {
    const key = `${transitionPoint.clip1.id}-${transitionPoint.clip2.id}`;
    return mismatchResults.get(key);
  };

  const handleSaveTimeline = async () => {
    if (!timeline) return;

    try {
      await api.put(`/projects/${projectId}/timeline`, {
        tracks: timeline.tracks,
      });
      alert('时间线已保存');
      loadTimeline();
    } catch (error: any) {
      alert(`保存失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleExportVideo = async () => {
    if (!timeline) return;

    try {
      setExporting(true);
      const response = await api.post(`/projects/${projectId}/timeline/export-video`, {
        format: 'mp4',
        quality: 'medium',
        resolution: '1920x1080',
      });
      alert(`视频导出成功: ${response.data.outputFile}`);
    } catch (error: any) {
      alert(`导出失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportProject = async (format: 'json' | 'edl' | 'xml') => {
    if (!timeline) return;

    try {
      const response = await api.post(`/projects/${projectId}/timeline/export-project`, {
        format,
      });
      alert(`工程文件导出成功: ${response.data.outputFile}`);
    } catch (error: any) {
      alert(`导出失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSaveVersion = async () => {
    const versionName = prompt('请输入版本名称:');
    if (!versionName) return;

    try {
      await api.post(`/projects/${projectId}/timeline/versions`, { versionName });
      alert('版本已保存');
      loadVersions();
    } catch (error: any) {
      alert(`保存版本失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleRestoreVersion = async (versionId: number) => {
    if (!confirm('确定要恢复到此版本吗？')) return;

    try {
      await api.post(`/projects/${projectId}/timeline/restore/${versionId}`);
      alert('版本已恢复');
      loadTimeline();
      loadVersions();
    } catch (error: any) {
      alert(`恢复版本失败: ${error.response?.data?.error || error.message}`);
    }
  };

  // New timeline editor handlers
  const getTotalDuration = (): number => {
    if (!timeline) return 0;
    const videoTrack = timeline.tracks.find(t => t.type === 'video');
    if (!videoTrack || videoTrack.clips.length === 0) return 0;
    
    const lastClip = videoTrack.clips.reduce((max, clip) => 
      (clip.endTime > max.endTime ? clip : max), videoTrack.clips[0]);
    return lastClip.endTime;
  };

  const handlePlay = () => {
    setIsPlaying(true);
    playbackIntervalRef.current = window.setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + (0.033 * playbackSpeed); // ~30fps
        if (newTime >= getTotalDuration()) {
          handleStop();
          return getTotalDuration();
        }
        return newTime;
      });
    }, 33);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const handleStop = () => {
    handlePause();
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, getTotalDuration())));
  };

  const handleFrameStep = (direction: 'forward' | 'backward') => {
    const frameTime = 1 / 30; // 30fps
    const newTime = direction === 'forward' 
      ? currentTime + frameTime 
      : currentTime - frameTime;
    handleSeek(newTime);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handleFitToWindow = () => {
    if (!timelineContainerRef.current) return;
    const containerWidth = timelineContainerRef.current.clientWidth - 100; // Account for track labels
    const duration = getTotalDuration();
    if (duration > 0) {
      setZoom(containerWidth / duration);
    }
  };

  const convertToTrackClips = (timelineClips: TimelineClip[]): TrackClip[] => {
    return timelineClips.map(clip => ({
      id: clip.id,
      startTime: clip.startTime,
      duration: clip.endTime - clip.startTime,
      label: `Clip ${clip.clipId}`,
      color: '#4a90e2',
    }));
  };

  const handleClipClick = (clip: TrackClip) => {
    setSelectedClip(clip);
  };

  const handleClipTrim = (clipId: string, inPoint: number, outPoint: number) => {
    if (!timeline) return;
    
    const updatedTracks = timeline.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => 
        clip.id === clipId 
          ? { ...clip, inPoint, outPoint, endTime: clip.startTime + (outPoint - inPoint) }
          : clip
      ),
    }));

    setTimeline({ ...timeline, tracks: updatedTracks });
    detectConflicts();
  };

  const handleClipReorder = (draggedId: string, targetId: string) => {
    if (!timeline) return;

    const videoTrack = timeline.tracks.find(t => t.type === 'video');
    if (!videoTrack) return;

    const draggedIndex = videoTrack.clips.findIndex(c => c.id === draggedId);
    const targetIndex = videoTrack.clips.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newClips = [...videoTrack.clips];
    const [draggedClip] = newClips.splice(draggedIndex, 1);
    newClips.splice(targetIndex, 0, draggedClip);

    // Recalculate start times
    let currentTime = 0;
    newClips.forEach(clip => {
      clip.startTime = currentTime;
      clip.endTime = currentTime + (clip.outPoint - clip.inPoint);
      currentTime = clip.endTime;
    });

    const updatedTracks = timeline.tracks.map(track =>
      track.type === 'video' ? { ...track, clips: newClips } : track
    );

    setTimeline({ ...timeline, tracks: updatedTracks });
    detectConflicts();
  };

  const detectConflicts = () => {
    if (!timeline) return;

    const videoTrack = timeline.tracks.find(t => t.type === 'video');
    if (!videoTrack) return;

    const trackClips = convertToTrackClips(videoTrack.clips);
    const detectedConflicts = detectAllConflicts(trackClips);
    setConflicts(detectedConflicts);
  };

  const handleFixConflict = (conflict: ConflictInfo) => {
    if (!timeline) return;

    const videoTrack = timeline.tracks.find(t => t.type === 'video');
    if (!videoTrack) return;

    const trackClips = convertToTrackClips(videoTrack.clips);
    const fixedClips = autoFixConflicts(trackClips, [conflict]);

    // Convert back to timeline clips
    const fixedTimelineClips = videoTrack.clips.map((clip, index) => ({
      ...clip,
      startTime: fixedClips[index].startTime,
      endTime: fixedClips[index].startTime + fixedClips[index].duration,
    }));

    const updatedTracks = timeline.tracks.map(track =>
      track.type === 'video' ? { ...track, clips: fixedTimelineClips } : track
    );

    setTimeline({ ...timeline, tracks: updatedTracks });
    detectConflicts();
  };

  const handleAddTransition = (fromClipId: string, toClipId: string) => {
    const videoTrack = timeline?.tracks.find(t => t.type === 'video');
    if (!videoTrack) return;

    const fromClip = videoTrack.clips.find(c => c.id === fromClipId);
    const toClip = videoTrack.clips.find(c => c.id === toClipId);

    if (!fromClip || !toClip) return;

    const newTransition: Transition = {
      id: `transition-${Date.now()}`,
      fromClipId,
      toClipId,
      type: 'cut',
      duration: 0,
      position: fromClip.endTime,
    };

    setEditingTransition(newTransition);
    setShowTransitionEditor(true);
  };

  const handleSaveTransition = (transition: Transition) => {
    setTransitions(prev => {
      const existing = prev.findIndex(t => t.id === transition.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = transition;
        return updated;
      }
      return [...prev, transition];
    });
  };

  const handleDeleteTransition = (transitionId: string) => {
    setTransitions(prev => prev.filter(t => t.id !== transitionId));
  };

  // Detect conflicts on timeline changes
  useEffect(() => {
    detectConflicts();
  }, [timeline]);

  if (loading) {
    return <div className="timeline-editor-view loading">加载中...</div>;
  }

  if (!timeline) {
    return <div className="timeline-editor-view empty">未找到时间线</div>;
  }

  const videoTrack = timeline.tracks.find(t => t.type === 'video');
  const audioTrack = timeline.tracks.find(t => t.type === 'audio');

  return (
    <div className="timeline-editor-view">
      <div className="timeline-header">
        <h2>时间线编辑器</h2>
        <div className="timeline-actions">
          <button onClick={handleSaveTimeline} className="btn-primary">
            保存时间线
          </button>
          <button onClick={handleSaveVersion} className="btn-secondary">
            保存版本
          </button>
          <button onClick={() => setShowVersions(!showVersions)} className="btn-secondary">
            {showVersions ? '隐藏' : '显示'}版本历史
          </button>
          <button onClick={handleExportVideo} disabled={exporting} className="btn-success">
            {exporting ? '导出中...' : '导出视频'}
          </button>
          <div className="export-dropdown">
            <button className="btn-secondary">导出工程文件 ▼</button>
            <div className="dropdown-content">
              <button onClick={() => handleExportProject('json')}>JSON</button>
              <button onClick={() => handleExportProject('edl')}>EDL</button>
              <button onClick={() => handleExportProject('xml')}>FCP XML</button>
            </div>
          </div>
        </div>
      </div>

      {showVersions && (
        <div className="versions-panel">
          <h3>版本历史</h3>
          <div className="versions-list">
            {versions.map(v => (
              <div key={v.id} className="version-item">
                <div className="version-info">
                  <strong>v{v.version}</strong>
                  {v.versionName && <span> - {v.versionName}</span>}
                </div>
                <button onClick={() => handleRestoreVersion(v.id)} className="btn-small">
                  恢复
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transition Points Section */}
      {transitionPoints.length > 0 && (
        <div className="transition-points-section">
          <h3>镜头衔接点 ({transitionPoints.length})</h3>
          <p className="section-hint">
            点击衔接点可以预览前后镜头的帧对比，检查画面连贯性
          </p>
          <div className="transition-points-list">
            {transitionPoints.map((point, index) => {
              const mismatch = getMismatchResult(point);
              const hasWarning = mismatch && mismatch.hasMismatch;

              return (
                <div
                  key={`${point.clip1.id}-${point.clip2.id}`}
                  className={`transition-point-card ${selectedTransition === point ? 'selected' : ''} ${hasWarning ? 'warning' : ''}`}
                  onClick={() => setSelectedTransition(point)}
                >
                  <div className="transition-point-header">
                    <span className="transition-number">#{index + 1}</span>
                    <span className="transition-shots">
                      {point.shot1.shotId} → {point.shot2.shotId}
                    </span>
                    <span className="transition-time">
                      @ {point.position.toFixed(1)}s
                    </span>
                  </div>
                  <div className="transition-point-info">
                    <span className="transition-type">
                      {point.shot2.transitionType === 'cut' && '✂️ 切'}
                      {point.shot2.transitionType === 'dissolve' && '🌊 溶'}
                      {point.shot2.transitionType === 'motion' && '➡️ 动态'}
                    </span>
                    {point.shot2.useLastFrameAsFirst && (
                      <span className="seamless-badge">🔗 无缝衔接</span>
                    )}
                    {mismatch && (
                      <span className={`similarity-badge ${hasWarning ? 'warning' : 'good'}`}>
                        相似度: {(mismatch.similarity * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {hasWarning && (
                    <div className="mismatch-warning">
                      ⚠️ 检测到帧不匹配，建议重新生成
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transition Preview Modal */}
      {selectedTransition && (
        <div className="modal-overlay" onClick={() => setSelectedTransition(null)}>
          <div className="modal transition-preview-modal" onClick={(e) => e.stopPropagation()}>
            <h2>衔接点预览</h2>
            <div className="transition-preview-content">
              <div className="preview-info">
                <div className="preview-shot-info">
                  <strong>{selectedTransition.shot1.shotId}</strong>
                  <span className="shot-description">
                    {selectedTransition.shot1.description || '无描述'}
                  </span>
                </div>
                <div className="preview-arrow">→</div>
                <div className="preview-shot-info">
                  <strong>{selectedTransition.shot2.shotId}</strong>
                  <span className="shot-description">
                    {selectedTransition.shot2.description || '无描述'}
                  </span>
                </div>
              </div>

              <div className="frame-comparison">
                <div className="frame-preview">
                  <h4>{selectedTransition.shot1.shotId} 尾帧</h4>
                  <div className="frame-placeholder">
                    <span>🎬</span>
                    <p>视频最后一帧</p>
                    <small>Clip ID: {selectedTransition.clip1.id.substring(0, 8)}</small>
                  </div>
                </div>

                <div className="comparison-arrow">
                  {selectedTransition.shot2.useLastFrameAsFirst ? (
                    <div className="seamless-indicator">
                      <span className="arrow">⟹</span>
                      <span className="label">无缝衔接</span>
                    </div>
                  ) : (
                    <div className="normal-transition">
                      <span className="arrow">→</span>
                      <span className="label">
                        {selectedTransition.shot2.transitionType === 'cut' && '切'}
                        {selectedTransition.shot2.transitionType === 'dissolve' && '溶'}
                        {selectedTransition.shot2.transitionType === 'motion' && '动态'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="frame-preview">
                  <h4>{selectedTransition.shot2.shotId} 首帧</h4>
                  <div className="frame-placeholder">
                    <span>🎬</span>
                    <p>视频第一帧</p>
                    <small>Clip ID: {selectedTransition.clip2.id.substring(0, 8)}</small>
                  </div>
                </div>
              </div>

              {(() => {
                const mismatch = getMismatchResult(selectedTransition);
                if (mismatch) {
                  return (
                    <div className={`mismatch-result ${mismatch.hasMismatch ? 'warning' : 'success'}`}>
                      <div className="result-icon">
                        {mismatch.hasMismatch ? '⚠️' : '✅'}
                      </div>
                      <div className="result-content">
                        <strong>{mismatch.message}</strong>
                        {mismatch.hasMismatch && (
                          <p>建议在视频生成页面重新生成 {selectedTransition.shot2.shotId} 的视频片段</p>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="preview-actions">
                <button
                  onClick={() => checkFrameMismatch(selectedTransition)}
                  disabled={checkingMismatch}
                  className="btn-primary"
                >
                  {checkingMismatch ? '检测中...' : '检测帧匹配度'}
                </button>
                <button onClick={() => setSelectedTransition(null)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Warning */}
      {conflicts.length > 0 && showConflicts && (
        <ConflictWarning
          conflicts={conflicts}
          onFixConflict={handleFixConflict}
          onDismiss={() => setShowConflicts(false)}
        />
      )}

      {/* Playback Controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={getTotalDuration()}
        playbackSpeed={playbackSpeed}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        onSpeedChange={setPlaybackSpeed}
        onFrameStep={handleFrameStep}
      />

      {/* Audio Import Section */}
      {projectId && (
        <div className="audio-section">
          <AudioImporter
            projectId={projectId}
            audioType="voiceover"
            currentAudioPath={timeline?.voiceoverAudioPath || undefined}
            onUploadSuccess={(audioPath, duration) => {
              if (timeline) {
                setTimeline({ ...timeline, voiceoverAudioPath: audioPath });
              }
              alert(`旁白音频上传成功${duration ? `，时长: ${duration.toFixed(2)}秒` : ''}`);
            }}
            onDelete={() => {
              if (timeline) {
                setTimeline({ ...timeline, voiceoverAudioPath: undefined });
              }
              alert('旁白音频已删除');
            }}
          />
          <AudioImporter
            projectId={projectId}
            audioType="bgm"
            currentAudioPath={timeline?.bgmAudioPath || undefined}
            onUploadSuccess={(audioPath, duration) => {
              if (timeline) {
                setTimeline({ ...timeline, bgmAudioPath: audioPath });
              }
              alert(`背景音乐上传成功${duration ? `，时长: ${duration.toFixed(2)}秒` : ''}`);
            }}
            onDelete={() => {
              if (timeline) {
                setTimeline({ ...timeline, bgmAudioPath: undefined });
              }
              alert('背景音乐已删除');
            }}
          />
        </div>
      )}

      {/* Timeline Zoom Controls */}
      <div className="timeline-controls">
        <TimelineZoom
          zoom={zoom}
          minZoom={10}
          maxZoom={200}
          onZoomChange={handleZoomChange}
          onFitToWindow={handleFitToWindow}
        />
      </div>

      {/* Visual Timeline */}
      <DndProvider backend={HTML5Backend}>
        <div className="timeline-content" ref={timelineContainerRef}>
          <div className="timeline-viewport">
            {/* Timeline Ruler */}
            <TimelineRuler
              duration={getTotalDuration()}
              pixelsPerSecond={zoom}
              width={getTotalDuration() * zoom}
            />

            {/* Timeline Tracks */}
            <div className="timeline-tracks">
              {videoTrack && (
                <TimelineTrack
                  trackType="video"
                  clips={convertToTrackClips(videoTrack.clips)}
                  pixelsPerSecond={zoom}
                  onClipClick={(clip) => {
                    handleClipClick(clip);
                    setShowTrimmer(true);
                  }}
                  onClipReorder={handleClipReorder}
                />
              )}

              {audioTrack && audioTrack.clips.length > 0 && (
                <TimelineTrack
                  trackType="audio"
                  clips={convertToTrackClips(audioTrack.clips)}
                  pixelsPerSecond={zoom}
                  onClipClick={handleClipClick}
                />
              )}
            </div>

            {/* Transition Markers */}
            <div className="transition-markers-layer">
              {transitions.map((transition) => (
                <TransitionMarker
                  key={transition.id}
                  transition={transition}
                  pixelsPerSecond={zoom}
                  onClick={() => {
                    setEditingTransition(transition);
                    setShowTransitionEditor(true);
                  }}
                />
              ))}
            </div>

            {/* Playhead */}
            <TimelinePlayhead
              currentTime={currentTime}
              pixelsPerSecond={zoom}
              height={200}
              onSeek={handleSeek}
            />
          </div>
        </div>
      </DndProvider>

      {/* Clip Trimmer Modal */}
      {showTrimmer && selectedClip && (
        <ClipTrimmer
          clipId={selectedClip.id}
          clipName={selectedClip.label}
          inPoint={0}
          outPoint={selectedClip.duration}
          maxDuration={selectedClip.duration}
          onUpdate={handleClipTrim}
          onClose={() => setShowTrimmer(false)}
        />
      )}

      {/* Transition Editor Modal */}
      {showTransitionEditor && editingTransition && (
        <TransitionEditor
          transition={editingTransition}
          onSave={handleSaveTransition}
          onDelete={handleDeleteTransition}
          onClose={() => {
            setShowTransitionEditor(false);
            setEditingTransition(null);
          }}
        />
      )}

      {/* Legacy Simple View (for reference) */}
      <details className="legacy-view">
        <summary>简单列表视图</summary>
        <div className="track-container">
          <div className="track-header">
            <h3>视频轨道</h3>
            <span className="track-info">{videoTrack?.clips.length || 0} 个片段</span>
          </div>
          <div className="track-clips">
            {videoTrack?.clips.length === 0 ? (
              <div className="empty-track">暂无视频片段，请先在视频生成页面生成视频</div>
            ) : (
              videoTrack?.clips.map(clip => (
                <div key={clip.id} className="clip-item">
                  <div className="clip-info">
                    <div>Clip #{clip.clipId}</div>
                    <div className="clip-time">
                      {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}s
                    </div>
                    <div className="clip-duration">
                      时长: {(clip.endTime - clip.startTime).toFixed(2)}s
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </details>
    </div>
  );
};
