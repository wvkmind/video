import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  shotApi,
  sceneApi,
  projectApi,
  Shot,
  Scene,
  Project,
  CreateShotData,
  BatchStyleData,
} from '../services/api';
import StatusSelector from './StatusSelector';
import StatusFilter from './StatusFilter';
import { updateShotStatus } from '../utils/statusApi';
import { ModificationConfirmDialog } from './ModificationConfirmDialog';
import { useModificationConfirm } from '../hooks/useModificationConfirm';
import './StoryboardView.css';

const StoryboardView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shot form state
  const [showShotForm, setShowShotForm] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [shotForm, setShotForm] = useState<CreateShotData>({
    sceneId: '',
    shotId: '',
    duration: 5,
    shotType: 'medium',
    description: '',
    environment: '',
    subject: '',
    action: '',
    cameraMovement: '',
    lighting: '',
    style: '',
    transitionType: 'cut',
    useLastFrameAsFirst: false,
    relatedVoiceover: '',
    importance: 'medium',
  });

  // Batch operations
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
  const [showBatchStyleForm, setShowBatchStyleForm] = useState(false);
  const [batchStyleForm, setBatchStyleForm] = useState<BatchStyleData>({
    style: '',
    lighting: '',
    cameraMovement: '',
  });

  // Drag and drop
  const [draggedShot, setDraggedShot] = useState<Shot | null>(null);

  // Timeline view
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      // Load project
      const projectRes = await projectApi.get(projectId);
      setProject(projectRes.data);

      // Load scenes
      const scenesRes = await sceneApi.list(projectId);
      setScenes(scenesRes.data);

      // Load shots
      const shotsRes = await shotApi.list(projectId);
      setShots(shotsRes.data);

      // Select first scene by default
      if (scenesRes.data.length > 0 && !selectedSceneId) {
        setSelectedSceneId(scenesRes.data[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    try {
      await shotApi.create(projectId, shotForm);
      setShowShotForm(false);
      resetShotForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '创建镜头失败');
    }
  };

  // Modification confirm dialog for shot
  const [shotToUpdate, setShotToUpdate] = useState<Shot | null>(null);
  const { dialogProps: shotDialogProps, showConfirmDialog: showShotConfirmDialog } = useModificationConfirm({
    entityType: 'shot',
    entityId: shotToUpdate?.id || '',
    entityName: shotToUpdate?.shotId || 'Shot',
    onConfirm: async (refreshDownstream) => {
      if (!shotToUpdate) return;
      
      try {
        await shotApi.update(shotToUpdate.id, shotForm);
        
        if (refreshDownstream) {
          // 批量刷新关键帧和视频片段
          try {
            const refreshResponse = await fetch(`/api/shots/${shotToUpdate.id}/batch-refresh`, {
              method: 'POST',
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              alert(`批量刷新完成：${refreshData.summary.completed}/${refreshData.summary.total} 成功`);
            } else {
              console.error('批量刷新失败');
            }
          } catch (refreshErr) {
            console.error('批量刷新错误:', refreshErr);
          }
        }
        
        setEditingShot(null);
        setShotToUpdate(null);
        resetShotForm();
        await loadData();
        alert('镜头更新成功');
      } catch (err: any) {
        alert(err.response?.data?.error?.message || '更新镜头失败');
      }
    }
  });

  const handleUpdateShot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShot) return;

    setShotToUpdate(editingShot);
    showShotConfirmDialog();
  };

  const handleDeleteShot = async (shotId: string) => {
    if (!confirm('确定要删除这个镜头吗？')) return;

    try {
      await shotApi.delete(shotId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '删除镜头失败');
    }
  };

  const handleEditShot = (shot: Shot) => {
    setEditingShot(shot);
    setShotForm({
      sceneId: shot.sceneId,
      shotId: shot.shotId,
      duration: shot.duration,
      shotType: shot.shotType,
      description: shot.description || '',
      environment: shot.environment || '',
      subject: shot.subject || '',
      action: shot.action || '',
      cameraMovement: shot.cameraMovement || '',
      lighting: shot.lighting || '',
      style: shot.style || '',
      previousShotId: shot.previousShotId,
      nextShotId: shot.nextShotId,
      transitionType: shot.transitionType || 'cut',
      useLastFrameAsFirst: shot.useLastFrameAsFirst || false,
      relatedVoiceover: shot.relatedVoiceover || '',
      importance: shot.importance || 'medium',
    });
    setShowShotForm(true);
  };

  const resetShotForm = () => {
    setShotForm({
      sceneId: selectedSceneId || '',
      shotId: '',
      duration: 5,
      shotType: 'medium',
      description: '',
      environment: '',
      subject: '',
      action: '',
      cameraMovement: '',
      lighting: '',
      style: '',
      transitionType: 'cut',
      useLastFrameAsFirst: false,
      relatedVoiceover: '',
      importance: 'medium',
    });
  };

  const handleDragStart = (shot: Shot) => {
    setDraggedShot(shot);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetShot: Shot) => {
    if (!draggedShot || draggedShot.id === targetShot.id) return;

    try {
      // Reorder shots
      const sceneShots = shots.filter((s) => s.sceneId === targetShot.sceneId);
      const draggedIndex = sceneShots.findIndex((s) => s.id === draggedShot.id);
      const targetIndex = sceneShots.findIndex((s) => s.id === targetShot.id);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Create new order
      const newOrder = [...sceneShots];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedShot);

      // Submit reorder
      await shotApi.reorder(newOrder.map((s) => s.id));
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '重新排序失败');
    } finally {
      setDraggedShot(null);
    }
  };

  const toggleShotSelection = (shotId: string) => {
    const newSelection = new Set(selectedShots);
    if (newSelection.has(shotId)) {
      newSelection.delete(shotId);
    } else {
      newSelection.add(shotId);
    }
    setSelectedShots(newSelection);
  };

  const handleBatchStyleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShots.size === 0) {
      alert('请先选择要批量设置的镜头');
      return;
    }

    try {
      await shotApi.batchUpdateStyle(Array.from(selectedShots), batchStyleForm);
      setShowBatchStyleForm(false);
      setBatchStyleForm({ style: '', lighting: '', cameraMovement: '' });
      setSelectedShots(new Set());
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '批量设置风格失败');
    }
  };

  const handleExportStoryboard = async (format: 'json' | 'csv') => {
    if (!projectId) return;

    try {
      const response = await shotApi.exportStoryboard(projectId, format);
      
      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `storyboard-${projectId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `storyboard-${projectId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '导出分镜表失败');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getShotTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      wide: '远景',
      medium: '中景',
      closeup: '特写',
      transition: '过渡',
    };
    return labels[type] || type;
  };

  const getTransitionTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      cut: '切',
      dissolve: '溶',
      motion: '动态',
    };
    return type ? labels[type] || type : '切';
  };

  const getImportanceClass = (importance?: string) => {
    return `importance-${importance || 'medium'}`;
  };

  const handleStatusChange = async (shotId: string, newStatus: string) => {
    try {
      await updateShotStatus(shotId, newStatus);
      // Reload shots to get updated status
      await loadData();
    } catch (error) {
      console.error('Failed to update shot status:', error);
      throw error;
    }
  };

  const filteredShots = shots
    .filter((s) => (selectedSceneId ? s.sceneId === selectedSceneId : true))
    .filter((s) => (statusFilter ? s.status === statusFilter : true));

  const getSceneName = (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    return scene ? `场景 ${scene.sceneNumber}: ${scene.title}` : '未知场景';
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="storyboard-view">
      <div className="header">
        <button className="btn-back" onClick={() => navigate(`/projects/${projectId}/story`)}>
          ← 返回故事编辑
        </button>
        <h1>{project?.name} - 分镜管理</h1>
        <div className="header-actions">
          <button
            onClick={() => handleExportStoryboard('json')}
            className="btn-secondary"
          >
            导出 JSON
          </button>
          <button
            onClick={() => handleExportStoryboard('csv')}
            className="btn-secondary"
          >
            导出 CSV
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/keyframes`)}
            className="btn-secondary"
          >
            前往关键帧生成 →
          </button>
        </div>
      </div>

      {/* Scene Timeline */}
      <div className="scene-timeline">
        <h2>场景时间轴</h2>
        <div className="timeline-tracks">
          {scenes.map((scene) => {
            const sceneShots = shots.filter((s) => s.sceneId === scene.id);
            const totalDuration = sceneShots.reduce((sum, s) => sum + s.duration, 0);

            return (
              <div
                key={scene.id}
                className={`timeline-track ${selectedSceneId === scene.id ? 'active' : ''}`}
                onClick={() => setSelectedSceneId(scene.id)}
              >
                <div className="track-header">
                  <strong>{getSceneName(scene.id)}</strong>
                  <span className="track-info">
                    {sceneShots.length} 镜头 · {formatDuration(totalDuration)}
                  </span>
                </div>
                <div className="track-bar">
                  {sceneShots.map((shot) => (
                    <div
                      key={shot.id}
                      className="track-segment"
                      style={{
                        width: `${(shot.duration / totalDuration) * 100}%`,
                      }}
                      title={`${shot.shotId} - ${formatDuration(shot.duration)}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shot List */}
      <div className="shots-section">
        <div className="section-header">
          <h2>镜头列表</h2>
          <div className="section-actions">
            <StatusFilter
              currentFilter={statusFilter}
              onFilterChange={setStatusFilter}
              type="entity"
            />
            {selectedShots.size > 0 && (
              <>
                <span className="selection-count">已选择 {selectedShots.size} 个镜头</span>
                <button
                  onClick={() => setShowBatchStyleForm(true)}
                  className="btn-secondary"
                >
                  批量设置风格
                </button>
                <button
                  onClick={() => setSelectedShots(new Set())}
                  className="btn-secondary"
                >
                  取消选择
                </button>
              </>
            )}
            <button
              onClick={() => {
                setEditingShot(null);
                resetShotForm();
                setShowShotForm(true);
              }}
              className="btn-primary"
            >
              + 新建镜头
            </button>
          </div>
        </div>

        {filteredShots.length === 0 ? (
          <div className="empty-state">
            <p>
              {selectedSceneId
                ? '该场景还没有镜头，点击"新建镜头"开始创建'
                : '还没有镜头，请先选择一个场景'}
            </p>
          </div>
        ) : (
          <div className="shots-list">
            {filteredShots.map((shot, index) => {
              const prevShot = index > 0 ? filteredShots[index - 1] : null;
              const showTransition = prevShot && shot.previousShotId === prevShot.id;

              return (
                <div key={shot.id}>
                  {showTransition && (
                    <div className="transition-indicator">
                      <span className="transition-line" />
                      <span className={`transition-label ${shot.useLastFrameAsFirst ? 'seamless' : ''}`}>
                        <span className="transition-icon">
                          {shot.transitionType === 'cut' && '✂️'}
                          {shot.transitionType === 'dissolve' && '🌊'}
                          {shot.transitionType === 'motion' && '➡️'}
                        </span>
                        {getTransitionTypeLabel(shot.transitionType)}
                        {shot.useLastFrameAsFirst && (
                          <span className="seamless-badge" title="使用尾帧衔接">
                            🔗 无缝衔接
                          </span>
                        )}
                      </span>
                      <span className="transition-line" />
                    </div>
                  )}

                  <div
                    className={`shot-card ${selectedShots.has(shot.id) ? 'selected' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(shot)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(shot)}
                  >
                    <div className="shot-header">
                      <input
                        type="checkbox"
                        checked={selectedShots.has(shot.id)}
                        onChange={() => toggleShotSelection(shot.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="shot-title">
                        <h3>{shot.shotId}</h3>
                        <span className={`shot-type ${shot.shotType}`}>
                          {getShotTypeLabel(shot.shotType)}
                        </span>
                        <span className={`importance-badge ${getImportanceClass(shot.importance)}`}>
                          {shot.importance === 'high' ? '重要' : shot.importance === 'low' ? '次要' : '一般'}
                        </span>
                        <StatusSelector
                          currentStatus={shot.status || 'draft'}
                          type="entity"
                          onStatusChange={(newStatus) => handleStatusChange(shot.id, newStatus)}
                        />
                      </div>
                      <div className="shot-actions">
                        <button onClick={() => handleEditShot(shot)} className="btn-small">
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteShot(shot.id)}
                          className="btn-small btn-danger"
                        >
                          删除
                        </button>
                      </div>
                    </div>

                    <div className="shot-body">
                      <div className="shot-info">
                        <span>时长: {formatDuration(shot.duration)}</span>
                        <span>顺序: #{shot.sequenceNumber}</span>
                        {shot.previousShotId && (
                          <span className="connection-badge" title="与上一镜头衔接">
                            🔗 衔接
                          </span>
                        )}
                      </div>

                      {shot.description && (
                        <p className="shot-description">{shot.description}</p>
                      )}

                      {shot.previousShotId && (
                        <div className="transition-info">
                          <strong>衔接信息：</strong>
                          <span>
                            与 {filteredShots.find((s) => s.id === shot.previousShotId)?.shotId || '未知镜头'} 衔接
                          </span>
                          {shot.useLastFrameAsFirst && (
                            <span className="seamless-indicator">
                              · 使用尾帧衔接（无缝连接）
                            </span>
                          )}
                        </div>
                      )}

                      <div className="shot-details">
                        {shot.environment && (
                          <div className="detail-item">
                            <strong>环境:</strong> {shot.environment}
                          </div>
                        )}
                        {shot.subject && (
                          <div className="detail-item">
                            <strong>主体:</strong> {shot.subject}
                          </div>
                        )}
                        {shot.action && (
                          <div className="detail-item">
                            <strong>动作:</strong> {shot.action}
                          </div>
                        )}
                        {shot.cameraMovement && (
                          <div className="detail-item">
                            <strong>镜头运动:</strong> {shot.cameraMovement}
                          </div>
                        )}
                        {shot.lighting && (
                          <div className="detail-item">
                            <strong>光线:</strong> {shot.lighting}
                          </div>
                        )}
                        {shot.style && (
                          <div className="detail-item">
                            <strong>风格:</strong> {shot.style}
                          </div>
                        )}
                        {shot.relatedVoiceover && (
                          <div className="detail-item voiceover">
                            <strong>旁白:</strong> {shot.relatedVoiceover}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shot Form Modal */}
      {showShotForm && (
        <div className="modal-overlay" onClick={() => setShowShotForm(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingShot ? '编辑镜头' : '新建镜头'}</h2>
            <form onSubmit={editingShot ? handleUpdateShot : handleCreateShot}>
              <div className="form-row">
                <div className="form-group">
                  <label>所属场景 *</label>
                  <select
                    value={shotForm.sceneId}
                    onChange={(e) => setShotForm({ ...shotForm, sceneId: e.target.value })}
                    required
                  >
                    <option value="">请选择场景</option>
                    {scenes.map((scene) => (
                      <option key={scene.id} value={scene.id}>
                        {getSceneName(scene.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>镜头 ID *</label>
                  <input
                    type="text"
                    value={shotForm.shotId}
                    onChange={(e) => setShotForm({ ...shotForm, shotId: e.target.value })}
                    placeholder="例如: S1-01"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>时长（秒）*</label>
                  <input
                    type="number"
                    value={shotForm.duration}
                    onChange={(e) =>
                      setShotForm({ ...shotForm, duration: parseFloat(e.target.value) })
                    }
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>画面类型 *</label>
                  <select
                    value={shotForm.shotType}
                    onChange={(e) =>
                      setShotForm({
                        ...shotForm,
                        shotType: e.target.value as 'wide' | 'medium' | 'closeup' | 'transition',
                      })
                    }
                    required
                  >
                    <option value="wide">远景</option>
                    <option value="medium">中景</option>
                    <option value="closeup">特写</option>
                    <option value="transition">过渡</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>重要性</label>
                  <select
                    value={shotForm.importance}
                    onChange={(e) =>
                      setShotForm({
                        ...shotForm,
                        importance: e.target.value as 'high' | 'medium' | 'low',
                      })
                    }
                  >
                    <option value="high">重要</option>
                    <option value="medium">一般</option>
                    <option value="low">次要</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>镜头描述</label>
                <textarea
                  value={shotForm.description}
                  onChange={(e) => setShotForm({ ...shotForm, description: e.target.value })}
                  rows={2}
                  placeholder="简要描述这个镜头..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>环境</label>
                  <input
                    type="text"
                    value={shotForm.environment}
                    onChange={(e) => setShotForm({ ...shotForm, environment: e.target.value })}
                    placeholder="例如: 室内/室外、白天/夜晚"
                  />
                </div>

                <div className="form-group">
                  <label>主体</label>
                  <input
                    type="text"
                    value={shotForm.subject}
                    onChange={(e) => setShotForm({ ...shotForm, subject: e.target.value })}
                    placeholder="例如: 主角、产品"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>动作</label>
                <input
                  type="text"
                  value={shotForm.action}
                  onChange={(e) => setShotForm({ ...shotForm, action: e.target.value })}
                  placeholder="例如: 走路、说话、展示产品"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>镜头运动</label>
                  <input
                    type="text"
                    value={shotForm.cameraMovement}
                    onChange={(e) =>
                      setShotForm({ ...shotForm, cameraMovement: e.target.value })
                    }
                    placeholder="例如: 推、拉、摇、移"
                  />
                </div>

                <div className="form-group">
                  <label>光线氛围</label>
                  <input
                    type="text"
                    value={shotForm.lighting}
                    onChange={(e) => setShotForm({ ...shotForm, lighting: e.target.value })}
                    placeholder="例如: 柔和、强烈、逆光"
                  />
                </div>

                <div className="form-group">
                  <label>风格</label>
                  <input
                    type="text"
                    value={shotForm.style}
                    onChange={(e) => setShotForm({ ...shotForm, style: e.target.value })}
                    placeholder="例如: 电影感、卡通风格"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>相关旁白</label>
                <textarea
                  value={shotForm.relatedVoiceover}
                  onChange={(e) =>
                    setShotForm({ ...shotForm, relatedVoiceover: e.target.value })
                  }
                  rows={2}
                  placeholder="这个镜头对应的旁白内容..."
                />
              </div>

              <div className="form-section">
                <h3>衔接设置</h3>
                
                <div className="form-group">
                  <label>上一镜头</label>
                  <select
                    value={shotForm.previousShotId || ''}
                    onChange={(e) =>
                      setShotForm({ ...shotForm, previousShotId: e.target.value || undefined })
                    }
                  >
                    <option value="">无（独立镜头）</option>
                    {filteredShots
                      .filter((s) => !editingShot || s.id !== editingShot.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.shotId} - {s.description || '无描述'}
                        </option>
                      ))}
                  </select>
                  <small className="form-hint">
                    选择此镜头衔接的上一个镜头，用于实现画面连贯性
                  </small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>转场类型</label>
                    <select
                      value={shotForm.transitionType}
                      onChange={(e) =>
                        setShotForm({
                          ...shotForm,
                          transitionType: e.target.value as 'cut' | 'dissolve' | 'motion',
                        })
                      }
                    >
                      <option value="cut">切（直接切换）</option>
                      <option value="dissolve">溶（淡入淡出）</option>
                      <option value="motion">动态（运动衔接）</option>
                    </select>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={shotForm.useLastFrameAsFirst || false}
                        onChange={(e) =>
                          setShotForm({ ...shotForm, useLastFrameAsFirst: e.target.checked })
                        }
                        disabled={!shotForm.previousShotId}
                      />
                      <span>使用上一镜头尾帧作为首帧</span>
                    </label>
                    <small className="form-hint">
                      {shotForm.previousShotId
                        ? '启用后，生成视频时将使用上一镜头的最后一帧作为当前镜头的第一帧，实现无缝衔接'
                        : '请先选择上一镜头'}
                    </small>
                  </div>
                </div>

                {shotForm.previousShotId && (
                  <div className="transition-preview-hint">
                    <span className="hint-icon">ℹ️</span>
                    <div className="hint-text">
                      <strong>衔接提示：</strong>
                      <ul>
                        <li>
                          <strong>转场类型</strong>决定了镜头切换的视觉效果
                        </li>
                        <li>
                          <strong>尾帧衔接</strong>确保前后镜头画面完全连贯，适用于连续动作场景
                        </li>
                        <li>
                          在关键帧生成和视频生成阶段，系统会自动应用这些衔接设置
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowShotForm(false);
                    setEditingShot(null);
                    resetShotForm();
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {editingShot ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Style Form Modal */}
      {showBatchStyleForm && (
        <div className="modal-overlay" onClick={() => setShowBatchStyleForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>批量设置风格</h2>
            <form onSubmit={handleBatchStyleUpdate}>
              <p className="form-hint">
                将为 {selectedShots.size} 个选中的镜头设置相同的风格参数
              </p>

              <div className="form-group">
                <label>风格</label>
                <input
                  type="text"
                  value={batchStyleForm.style}
                  onChange={(e) =>
                    setBatchStyleForm({ ...batchStyleForm, style: e.target.value })
                  }
                  placeholder="例如: 电影感、卡通风格"
                />
              </div>

              <div className="form-group">
                <label>光线氛围</label>
                <input
                  type="text"
                  value={batchStyleForm.lighting}
                  onChange={(e) =>
                    setBatchStyleForm({ ...batchStyleForm, lighting: e.target.value })
                  }
                  placeholder="例如: 柔和、强烈、逆光"
                />
              </div>

              <div className="form-group">
                <label>镜头运动</label>
                <input
                  type="text"
                  value={batchStyleForm.cameraMovement}
                  onChange={(e) =>
                    setBatchStyleForm({ ...batchStyleForm, cameraMovement: e.target.value })
                  }
                  placeholder="例如: 推、拉、摇、移"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchStyleForm(false);
                    setBatchStyleForm({ style: '', lighting: '', cameraMovement: '' });
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  应用
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modification Confirm Dialog */}
      <ModificationConfirmDialog {...shotDialogProps} />
    </div>
  );
};

export default StoryboardView;
