import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  shotApi,
  projectApi,
  keyframeApi,
  workflowApi,
  Shot,
  Project,
  Keyframe,
  WorkflowConfig,
  GenerateKeyframeParams,
} from '../services/api';
import './KeyframeGeneratorView.css';

const KeyframeGeneratorView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prompt editor state
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [autoPrompt, setAutoPrompt] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  // Workflow and parameters
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowConfig | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({
    steps: 20,
    cfg: 7,
    sampler: 'euler',
    width: 1024,
    height: 1024,
    seed: -1,
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Version management
  const [showVersions, setShowVersions] = useState(false);
  const [selectedKeyframeForPreview, setSelectedKeyframeForPreview] = useState<Keyframe | null>(
    null
  );

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedShot) {
      loadKeyframes();
      loadAutoPrompt();
    }
  }, [selectedShot]);

  useEffect(() => {
    if (selectedWorkflow) {
      // Initialize parameters with workflow defaults
      const defaultParams: Record<string, any> = {};
      selectedWorkflow.parameters.forEach((param) => {
        defaultParams[param.name] = param.defaultValue;
      });
      setParameters({ ...defaultParams });
    }
  }, [selectedWorkflow]);

  const loadData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      // Load project
      const projectRes = await projectApi.get(projectId);
      setProject(projectRes.data);

      // Load shots
      const shotsRes = await shotApi.list(projectId);
      setShots(shotsRes.data);

      // Select first shot by default
      if (shotsRes.data.length > 0) {
        setSelectedShot(shotsRes.data[0]);
      }

      // Load workflows
      const workflowsRes = await workflowApi.list('text_to_image');
      setWorkflows(workflowsRes.data.data);

      // Select first workflow by default
      if (workflowsRes.data.data.length > 0) {
        setSelectedWorkflow(workflowsRes.data.data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadKeyframes = async () => {
    if (!selectedShot) return;

    try {
      const res = await keyframeApi.list(selectedShot.id);
      setKeyframes(res.data);
    } catch (err: any) {
      console.error('Failed to load keyframes:', err);
    }
  };

  const loadAutoPrompt = async () => {
    if (!selectedShot) return;

    try {
      setLoadingPrompt(true);
      const res = await keyframeApi.getPrompt(selectedShot.id);
      setAutoPrompt(res.data.prompt);
      if (!prompt) {
        setPrompt(res.data.prompt);
      }
    } catch (err: any) {
      console.error('Failed to load auto prompt:', err);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleGenerateKeyframes = async () => {
    if (!selectedShot || !selectedWorkflow) {
      alert('请选择镜头和工作流');
      return;
    }

    if (!prompt.trim()) {
      alert('请输入 Prompt');
      return;
    }

    try {
      setGenerating(true);
      setGenerationProgress('正在提交生成任务...');

      const params: GenerateKeyframeParams = {
        workflowName: selectedWorkflow.name,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        ...parameters,
      };

      await keyframeApi.generate(selectedShot.id, params);
      setGenerationProgress('生成完成！');
      
      // Reload keyframes
      await loadKeyframes();
      
      setTimeout(() => {
        setGenerationProgress('');
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '生成关键帧失败');
      setGenerationProgress('');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectKeyframe = async (keyframe: Keyframe) => {
    try {
      await keyframeApi.select(keyframe.id);
      await loadKeyframes();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '选择关键帧失败');
    }
  };

  const handleUseAutoPrompt = () => {
    setPrompt(autoPrompt);
  };

  const handleParameterChange = (name: string, value: any) => {
    setParameters({ ...parameters, [name]: value });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '等待中',
      processing: '生成中',
      completed: '已完成',
      failed: '失败',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    return `status-badge status-${status}`;
  };

  const keyframeVersions = keyframes.filter((k) => k.shotId === selectedShot?.id);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="keyframe-generator-view">
      <div className="header">
        <button className="btn-back" onClick={() => navigate(`/projects/${projectId}/storyboard`)}>
          ← 返回分镜页
        </button>
        <h1>{project?.name} - 关键帧生成</h1>
        <div className="header-actions">
          <button onClick={() => navigate(`/projects/${projectId}/clips`)} className="btn-secondary">
            前往视频生成 →
          </button>
        </div>
      </div>

      <div className="content-layout">
        {/* Left Panel: Shot List */}
        <div className="left-panel">
          <div className="panel-header">
            <h2>镜头列表</h2>
            <span className="shot-count">{shots.length} 个镜头</span>
          </div>

          <div className="shot-list">
            {shots.length === 0 ? (
              <div className="empty-state">
                <p>还没有镜头</p>
                <button onClick={() => navigate(`/projects/${projectId}/storyboard`)}>
                  前往分镜页创建
                </button>
              </div>
            ) : (
              shots.map((shot) => {
                const shotKeyframes = keyframes.filter((k) => k.shotId === shot.id);
                const selectedKf = shotKeyframes.find((k) => k.isSelected);

                return (
                  <div
                    key={shot.id}
                    className={`shot-item ${selectedShot?.id === shot.id ? 'active' : ''}`}
                    onClick={() => setSelectedShot(shot)}
                  >
                    <div className="shot-thumbnail">
                      {selectedKf ? (
                        <img src={`/storage/${selectedKf.imagePath}`} alt={shot.shotId} />
                      ) : (
                        <div className="no-thumbnail">无关键帧</div>
                      )}
                    </div>
                    <div className="shot-info">
                      <h3>{shot.shotId}</h3>
                      <p className="shot-description">{shot.description || '无描述'}</p>
                      <div className="shot-meta">
                        <span>{shotKeyframes.length} 个版本</span>
                        {selectedKf && <span className="selected-indicator">✓ 已选定</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Panel: Keyframe Preview and Generation */}
        <div className="center-panel">
          {!selectedShot ? (
            <div className="empty-state">
              <p>请从左侧选择一个镜头</p>
            </div>
          ) : (
            <>
              {/* Shot Details */}
              <div className="shot-details-card">
                <h2>{selectedShot.shotId}</h2>
                <div className="shot-details-grid">
                  {selectedShot.description && <p><strong>描述:</strong> {selectedShot.description}</p>}
                  {selectedShot.environment && <p><strong>环境:</strong> {selectedShot.environment}</p>}
                  {selectedShot.subject && <p><strong>主体:</strong> {selectedShot.subject}</p>}
                  {selectedShot.action && <p><strong>动作:</strong> {selectedShot.action}</p>}
                  {selectedShot.cameraMovement && <p><strong>镜头运动:</strong> {selectedShot.cameraMovement}</p>}
                  {selectedShot.lighting && <p><strong>光线:</strong> {selectedShot.lighting}</p>}
                  {selectedShot.style && <p><strong>风格:</strong> {selectedShot.style}</p>}
                </div>
              </div>

              {/* Keyframe Preview Grid */}
              <div className="keyframe-preview-section">
                <div className="section-header">
                  <h3>关键帧预览</h3>
                  {keyframeVersions.length > 0 && (
                    <button onClick={() => setShowVersions(!showVersions)} className="btn-small">
                      {showVersions ? '隐藏' : '显示'}版本历史 ({keyframeVersions.length})
                    </button>
                  )}
                </div>

                {keyframeVersions.length === 0 ? (
                  <div className="empty-state">
                    <p>还没有生成关键帧</p>
                    <p className="hint">配置参数后点击"生成关键帧"按钮</p>
                  </div>
                ) : (
                  <div className="keyframe-grid">
                    {keyframeVersions.map((keyframe) => (
                      <div
                        key={keyframe.id}
                        className={`keyframe-card ${keyframe.isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedKeyframeForPreview(keyframe)}
                      >
                        <div className="keyframe-image-wrapper">
                          <img src={`/storage/${keyframe.imagePath}`} alt={`Version ${keyframe.version}`} />
                          {keyframe.isSelected && (
                            <div className="selected-badge">✓ 已选定</div>
                          )}
                          <div className={getStatusClass(keyframe.status)}>
                            {getStatusLabel(keyframe.status)}
                          </div>
                        </div>
                        <div className="keyframe-info">
                          <div className="keyframe-version">版本 {keyframe.version}</div>
                          <div className="keyframe-params">
                            <span>Steps: {keyframe.steps}</span>
                            <span>CFG: {keyframe.cfg}</span>
                            <span>Seed: {keyframe.seed}</span>
                          </div>
                          <div className="keyframe-date">{formatDate(keyframe.createdAt)}</div>
                        </div>
                        {!keyframe.isSelected && keyframe.status === 'completed' && (
                          <button
                            className="btn-select"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectKeyframe(keyframe);
                            }}
                          >
                            选定此版本
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generation Progress */}
              {generationProgress && (
                <div className="generation-progress">
                  <div className="progress-message">{generationProgress}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Panel: Parameters and Generation */}
        <div className="right-panel">
          {selectedShot && (
            <>
              {/* Prompt Editor */}
              <div className="param-section">
                <h3>Prompt 编辑器</h3>
                
                <div className="auto-prompt-section">
                  <label>自动生成的 Prompt</label>
                  {loadingPrompt ? (
                    <div className="loading-prompt">生成中...</div>
                  ) : (
                    <>
                      <div className="auto-prompt-display">{autoPrompt || '无'}</div>
                      <button onClick={handleUseAutoPrompt} className="btn-small" disabled={!autoPrompt}>
                        使用自动 Prompt
                      </button>
                    </>
                  )}
                </div>

                <div className="form-group">
                  <label>Prompt *</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    placeholder="输入英文 Prompt..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Negative Prompt</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={3}
                    placeholder="输入不想要的元素..."
                  />
                </div>
              </div>

              {/* Workflow Selector */}
              <div className="param-section">
                <h3>ComfyUI Workflow</h3>
                <div className="form-group">
                  <label>选择 Workflow</label>
                  <select
                    value={selectedWorkflow?.name || ''}
                    onChange={(e) => {
                      const workflow = workflows.find((w) => w.name === e.target.value);
                      setSelectedWorkflow(workflow || null);
                    }}
                  >
                    {workflows.map((workflow) => (
                      <option key={workflow.id} value={workflow.name}>
                        {workflow.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parameters Form */}
              {selectedWorkflow && (
                <div className="param-section">
                  <h3>生成参数</h3>
                  {selectedWorkflow.parameters.map((param) => (
                    <div key={param.name} className="form-group">
                      <label>{param.displayName}</label>
                      {param.type === 'number' ? (
                        <input
                          type="number"
                          value={parameters[param.name] ?? param.defaultValue}
                          onChange={(e) =>
                            handleParameterChange(param.name, parseFloat(e.target.value))
                          }
                          min={param.min}
                          max={param.max}
                          step={param.step || 1}
                        />
                      ) : param.type === 'select' ? (
                        <select
                          value={parameters[param.name] ?? param.defaultValue}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                        >
                          {param.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={parameters[param.name] ?? param.defaultValue}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Generate Button */}
              <div className="generate-section">
                <button
                  onClick={handleGenerateKeyframes}
                  disabled={generating || !prompt.trim() || !selectedWorkflow}
                  className="btn-primary btn-large"
                >
                  {generating ? '生成中...' : '生成关键帧'}
                </button>
                <p className="hint">将生成 4 张候选图片</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Keyframe Preview Modal */}
      {selectedKeyframeForPreview && (
        <div className="modal-overlay" onClick={() => setSelectedKeyframeForPreview(null)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <h2>关键帧详情 - 版本 {selectedKeyframeForPreview.version}</h2>
            <div className="keyframe-detail-content">
              <div className="keyframe-detail-image">
                <img
                  src={`/storage/${selectedKeyframeForPreview.imagePath}`}
                  alt={`Version ${selectedKeyframeForPreview.version}`}
                />
              </div>
              <div className="keyframe-detail-info">
                <div className="info-group">
                  <h3>生成参数</h3>
                  <p><strong>Workflow:</strong> {selectedKeyframeForPreview.workflowName}</p>
                  <p><strong>Steps:</strong> {selectedKeyframeForPreview.steps}</p>
                  <p><strong>CFG:</strong> {selectedKeyframeForPreview.cfg}</p>
                  <p><strong>Sampler:</strong> {selectedKeyframeForPreview.sampler}</p>
                  <p><strong>分辨率:</strong> {selectedKeyframeForPreview.width} x {selectedKeyframeForPreview.height}</p>
                  <p><strong>Seed:</strong> {selectedKeyframeForPreview.seed}</p>
                </div>
                <div className="info-group">
                  <h3>Prompt</h3>
                  <p className="prompt-text">{selectedKeyframeForPreview.prompt}</p>
                </div>
                {selectedKeyframeForPreview.negativePrompt && (
                  <div className="info-group">
                    <h3>Negative Prompt</h3>
                    <p className="prompt-text">{selectedKeyframeForPreview.negativePrompt}</p>
                  </div>
                )}
                <div className="info-group">
                  <p><strong>状态:</strong> <span className={getStatusClass(selectedKeyframeForPreview.status)}>{getStatusLabel(selectedKeyframeForPreview.status)}</span></p>
                  <p><strong>创建时间:</strong> {formatDate(selectedKeyframeForPreview.createdAt)}</p>
                </div>
              </div>
            </div>
            <div className="form-actions">
              {!selectedKeyframeForPreview.isSelected && selectedKeyframeForPreview.status === 'completed' && (
                <button
                  onClick={() => {
                    handleSelectKeyframe(selectedKeyframeForPreview);
                    setSelectedKeyframeForPreview(null);
                  }}
                  className="btn-primary"
                >
                  选定此版本
                </button>
              )}
              <button onClick={() => setSelectedKeyframeForPreview(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyframeGeneratorView;
