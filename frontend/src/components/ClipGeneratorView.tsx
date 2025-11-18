import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './ClipGeneratorView.css';

interface Shot {
  id: number;
  sceneId: number;
  shotNumber: number;
  description: string;
  cameraAngle?: string;
  cameraMovement?: string;
  selectedKeyframeId?: number;
  selectedClipId?: number;
}

interface Keyframe {
  id: number;
  shotId: number;
  imageUrl: string;
  isSelected: boolean;
}

interface Clip {
  id: number;
  shotId: number;
  videoUrl: string;
  isSelected: boolean;
  status: string;
  parameters: any;
  createdAt: string;
}

interface ClipGeneratorViewProps {
  projectId: number;
}

export const ClipGeneratorView: React.FC<ClipGeneratorViewProps> = ({ projectId }) => {
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Generation parameters
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [usePreviousLastFrame, setUsePreviousLastFrame] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareClips, setSelectedCompareClips] = useState<number[]>([]);
  const [parameters, setParameters] = useState({
    steps: 20,
    cfg: 7.5,
    seed: -1,
    fps: 24,
    frames: 48,
    motionBucketId: 127,
  });

  useEffect(() => {
    loadShots();
  }, [projectId]);

  useEffect(() => {
    if (selectedShot) {
      loadClips(selectedShot.id);
      loadKeyframes(selectedShot.id);
    }
  }, [selectedShot]);

  const loadShots = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/${projectId}/shots`);
      setShots(response.data);
      if (response.data.length > 0) {
        setSelectedShot(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load shots:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClips = async (shotId: number) => {
    try {
      const response = await api.get(`/shots/${shotId}/clips`);
      setClips(response.data);
    } catch (error) {
      console.error('Failed to load clips:', error);
    }
  };

  const loadKeyframes = async (shotId: number) => {
    try {
      const response = await api.get(`/shots/${shotId}/keyframes`);
      setKeyframes(response.data);
    } catch (error) {
      console.error('Failed to load keyframes:', error);
    }
  };

  const handleGenerateClip = async () => {
    if (!selectedShot) return;

    try {
      setGenerating(true);
      const payload = {
        inputMode,
        workflowName: inputMode === 'image' ? 'svd_image_to_video' : 'text_to_video',
        parameters: isDemoMode ? { ...parameters, steps: 10, frames: 24 } : parameters,
        usePreviousLastFrame,
      };

      await api.post(`/shots/${selectedShot.id}/generate-clip`, payload);
      
      // Poll for status
      pollClipStatus(selectedShot.id);
    } catch (error) {
      console.error('Failed to generate clip:', error);
      setGenerating(false);
    }
  };

  const pollClipStatus = async (shotId: number) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/shots/${shotId}/clips`);
        const latestClip = response.data[0];
        
        if (latestClip && (latestClip.status === 'completed' || latestClip.status === 'failed')) {
          clearInterval(interval);
          setGenerating(false);
          loadClips(shotId);
        }
      } catch (error) {
        console.error('Failed to poll clip status:', error);
        clearInterval(interval);
        setGenerating(false);
      }
    }, 2000);
  };

  const handleSelectClip = async (clipId: number) => {
    if (!selectedShot) return;

    try {
      await api.put(`/clips/${clipId}/select`);
      loadClips(selectedShot.id);
      loadShots(); // Refresh shot list to update selectedClipId
    } catch (error) {
      console.error('Failed to select clip:', error);
    }
  };

  const handleExtractFrame = async (clipId: number, frameNumber: number) => {
    try {
      const response = await api.post(`/clips/${clipId}/extract-frame`, { frameNumber });
      console.log('Frame extracted:', response.data);
      alert(`帧已提取: ${response.data.framePath}`);
    } catch (error) {
      console.error('Failed to extract frame:', error);
    }
  };

  const toggleCompareClip = (clipId: number) => {
    setSelectedCompareClips(prev => {
      if (prev.includes(clipId)) {
        return prev.filter(id => id !== clipId);
      } else if (prev.length < 2) {
        return [...prev, clipId];
      }
      return prev;
    });
  };

  return (
    <div className="clip-generator-view">
      <div className="clip-generator-sidebar">
        <h3>镜头列表</h3>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="shot-list">
            {shots.map((shot) => (
              <div
                key={shot.id}
                className={`shot-item ${selectedShot?.id === shot.id ? 'selected' : ''}`}
                onClick={() => setSelectedShot(shot)}
              >
                <div className="shot-number">镜头 {shot.shotNumber}</div>
                <div className="shot-description">{shot.description}</div>
                {shot.selectedKeyframeId && (
                  <div className="shot-status">✓ 关键帧已选</div>
                )}
                {shot.selectedClipId && (
                  <div className="shot-status clip-ready">✓ 视频已生成</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="clip-generator-main">
        {selectedShot ? (
          <>
            <div className="clip-generator-header">
              <h2>镜头 {selectedShot.shotNumber} - 视频生成</h2>
              <div className="shot-info">
                <p>{selectedShot.description}</p>
                {selectedShot.cameraAngle && <span>📷 {selectedShot.cameraAngle}</span>}
                {selectedShot.cameraMovement && <span>🎬 {selectedShot.cameraMovement}</span>}
              </div>
            </div>

            <div className="clip-generator-content">
              <div className="generation-controls">
                <h3>生成参数</h3>
                
                <div className="control-group">
                  <label>输入模式</label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        value="image"
                        checked={inputMode === 'image'}
                        onChange={(e) => setInputMode(e.target.value as 'image')}
                      />
                      图生视频
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="text"
                        checked={inputMode === 'text'}
                        onChange={(e) => setInputMode(e.target.value as 'text')}
                      />
                      文生视频
                    </label>
                  </div>
                </div>

                <div className="control-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={isDemoMode}
                      onChange={(e) => setIsDemoMode(e.target.checked)}
                    />
                    Demo 模式（快速预览）
                  </label>
                </div>

                <div className="control-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={usePreviousLastFrame}
                      onChange={(e) => setUsePreviousLastFrame(e.target.checked)}
                    />
                    使用上一镜头尾帧作为首帧
                  </label>
                </div>

                {!isDemoMode && (
                  <>
                    <div className="control-group">
                      <label>Steps: {parameters.steps}</label>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        value={parameters.steps}
                        onChange={(e) => setParameters({ ...parameters, steps: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="control-group">
                      <label>CFG Scale: {parameters.cfg}</label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={parameters.cfg}
                        onChange={(e) => setParameters({ ...parameters, cfg: parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="control-group">
                      <label>Frames: {parameters.frames}</label>
                      <input
                        type="range"
                        min="16"
                        max="120"
                        value={parameters.frames}
                        onChange={(e) => setParameters({ ...parameters, frames: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="control-group">
                      <label>FPS: {parameters.fps}</label>
                      <input
                        type="range"
                        min="12"
                        max="60"
                        value={parameters.fps}
                        onChange={(e) => setParameters({ ...parameters, fps: parseInt(e.target.value) })}
                      />
                    </div>

                    <div className="control-group">
                      <label>Seed</label>
                      <input
                        type="number"
                        value={parameters.seed}
                        onChange={(e) => setParameters({ ...parameters, seed: parseInt(e.target.value) })}
                      />
                    </div>
                  </>
                )}

                <button
                  className="generate-button"
                  onClick={handleGenerateClip}
                  disabled={generating || (inputMode === 'image' && !selectedShot.selectedKeyframeId)}
                >
                  {generating ? '生成中...' : '生成视频'}
                </button>
              </div>

              <div className="clip-preview-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0 }}>生成的视频片段</h3>
                  {clips.length > 1 && (
                    <button
                      className="compare-button"
                      onClick={() => {
                        setCompareMode(!compareMode);
                        setSelectedCompareClips([]);
                      }}
                    >
                      {compareMode ? '退出对比模式' : '版本对比'}
                    </button>
                  )}
                </div>

                {compareMode && selectedCompareClips.length === 2 && (
                  <div className="compare-view">
                    <div className="compare-grid">
                      {selectedCompareClips.map(clipId => {
                        const clip = clips.find(c => c.id === clipId);
                        return clip ? (
                          <div key={clip.id} className="compare-item">
                            <video src={clip.videoUrl} controls className="clip-video" />
                            <div className="clip-info">
                              <div className="clip-date">{new Date(clip.createdAt).toLocaleString()}</div>
                              <div>Steps: {clip.parameters?.steps || 'N/A'}</div>
                              <div>CFG: {clip.parameters?.cfg || 'N/A'}</div>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {clips.length === 0 ? (
                  <div className="empty-state">
                    <p>还没有生成视频片段</p>
                    <p>点击"生成视频"按钮开始</p>
                  </div>
                ) : (
                  <div className="clip-grid">
                    {clips.map((clip) => (
                      <div 
                        key={clip.id} 
                        className={`clip-card ${clip.isSelected ? 'selected' : ''} ${
                          compareMode && selectedCompareClips.includes(clip.id) ? 'comparing' : ''
                        }`}
                        onClick={() => compareMode && toggleCompareClip(clip.id)}
                      >
                        <video
                          src={clip.videoUrl}
                          controls
                          className="clip-video"
                        />
                        <div className="clip-info">
                          <div className="clip-status">
                            状态: {clip.status === 'completed' ? '✓ 完成' : clip.status}
                          </div>
                          <div className="clip-date">
                            {new Date(clip.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="clip-actions">
                          {compareMode ? (
                            <button 
                              className="compare-select-button"
                              disabled={!selectedCompareClips.includes(clip.id) && selectedCompareClips.length >= 2}
                            >
                              {selectedCompareClips.includes(clip.id) ? '✓ 已选择对比' : '选择对比'}
                            </button>
                          ) : (
                            <>
                              {!clip.isSelected && clip.status === 'completed' && (
                                <button onClick={() => handleSelectClip(clip.id)}>
                                  选为最终版本
                                </button>
                              )}
                              {clip.isSelected && (
                                <span className="selected-badge">✓ 已选中</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {inputMode === 'image' && keyframes.length > 0 && (
                <div className="keyframe-reference-section">
                  <h3>参考关键帧</h3>
                  <div className="keyframe-grid">
                    {keyframes.map((keyframe) => (
                      <div key={keyframe.id} className={`keyframe-card ${keyframe.isSelected ? 'selected' : ''}`}>
                        <img src={keyframe.imageUrl} alt="Keyframe" />
                        {keyframe.isSelected && <span className="selected-badge">✓ 已选中</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>请从左侧选择一个镜头</p>
          </div>
        )}
      </div>
    </div>
  );
};
