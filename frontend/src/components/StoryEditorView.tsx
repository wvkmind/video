import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storyApi, sceneApi, projectApi, Story, Scene, Project } from '../services/api';
import './StoryEditorView.css';

const StoryEditorView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Story form state
  const [storyForm, setStoryForm] = useState({
    hook: '',
    middleStructure: '',
    ending: '',
  });
  
  // Scene form state
  const [showSceneForm, setShowSceneForm] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [sceneForm, setSceneForm] = useState({
    title: '',
    description: '',
    estimatedDuration: 30,
    voiceoverText: '',
    dialogueText: '',
    notes: '',
  });
  
  // Version management
  const [storyVersions, setStoryVersions] = useState<Story[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedSceneForVersions, setSelectedSceneForVersions] = useState<string | null>(null);
  const [sceneVersions, setSceneVersions] = useState<Scene[]>([]);

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
      
      // Load story
      try {
        const storyRes = await storyApi.get(projectId);
        setStoryForm({
          hook: storyRes.data.hook || '',
          middleStructure: storyRes.data.middleStructure || '',
          ending: storyRes.data.ending || '',
        });
      } catch (err: any) {
        // Story might not exist yet, that's okay
        if (!err.response?.data?.error?.code?.includes('NOT_FOUND')) {
          throw err;
        }
      }
      
      // Load scenes
      const scenesRes = await sceneApi.list(projectId);
      setScenes(scenesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStory = async () => {
    if (!projectId) return;
    
    try {
      setSaving(true);
      await storyApi.update(projectId, storyForm);
      await loadData();
      alert('故事大纲保存成功');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '保存故事大纲失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    
    try {
      await sceneApi.create(projectId, sceneForm);
      setShowSceneForm(false);
      resetSceneForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '创建场景失败');
    }
  };

  const handleUpdateScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScene) return;
    
    try {
      await sceneApi.update(editingScene.id, sceneForm);
      setEditingScene(null);
      resetSceneForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '更新场景失败');
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm('确定要删除这个场景吗？')) return;
    
    try {
      await sceneApi.delete(sceneId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '删除场景失败');
    }
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setSceneForm({
      title: scene.title,
      description: scene.description || '',
      estimatedDuration: scene.estimatedDuration || 30,
      voiceoverText: scene.voiceoverText || '',
      dialogueText: scene.dialogueText || '',
      notes: scene.notes || '',
    });
    setShowSceneForm(true);
  };

  const resetSceneForm = () => {
    setSceneForm({
      title: '',
      description: '',
      estimatedDuration: 30,
      voiceoverText: '',
      dialogueText: '',
      notes: '',
    });
  };

  const loadStoryVersions = async () => {
    if (!projectId) return;
    
    try {
      const res = await storyApi.getVersions(projectId);
      setStoryVersions(res.data);
      setShowVersions(true);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '加载版本历史失败');
    }
  };

  const loadSceneVersions = async (sceneId: string) => {
    try {
      const res = await sceneApi.getVersions(sceneId);
      setSceneVersions(res.data);
      setSelectedSceneForVersions(sceneId);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '加载场景版本历史失败');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '未设置';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="story-editor-view">
      <div className="header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← 返回项目列表
        </button>
        <h1>{project?.name} - 故事编辑</h1>
        <div className="header-actions">
          <button onClick={loadStoryVersions} className="btn-secondary">
            查看版本历史
          </button>
          <button onClick={() => navigate(`/projects/${projectId}/storyboard`)}>
            前往分镜页 →
          </button>
        </div>
      </div>

      {/* Story Outline Section */}
      <div className="story-section">
        <div className="section-header">
          <h2>故事大纲</h2>
          <button onClick={handleSaveStory} disabled={saving} className="btn-primary">
            {saving ? '保存中...' : '保存大纲'}
          </button>
        </div>

        <div className="story-form">
          <div className="form-group">
            <label>开场 Hook</label>
            <textarea
              value={storyForm.hook}
              onChange={(e) => setStoryForm({ ...storyForm, hook: e.target.value })}
              rows={4}
              placeholder="吸引观众注意力的开场..."
            />
          </div>

          <div className="form-group">
            <label>中段结构</label>
            <textarea
              value={storyForm.middleStructure}
              onChange={(e) => setStoryForm({ ...storyForm, middleStructure: e.target.value })}
              rows={6}
              placeholder="故事的主体内容和发展..."
            />
          </div>

          <div className="form-group">
            <label>结尾</label>
            <textarea
              value={storyForm.ending}
              onChange={(e) => setStoryForm({ ...storyForm, ending: e.target.value })}
              rows={4}
              placeholder="故事的收尾和总结..."
            />
          </div>
        </div>
      </div>

      {/* Scenes Section */}
      <div className="scenes-section">
        <div className="section-header">
          <h2>场景列表</h2>
          <button
            onClick={() => {
              setEditingScene(null);
              resetSceneForm();
              setShowSceneForm(true);
            }}
            className="btn-primary"
          >
            + 新建场景
          </button>
        </div>

        <div className="scenes-list">
          {scenes.length === 0 ? (
            <div className="empty-state">
              <p>还没有场景，点击"新建场景"开始创建</p>
            </div>
          ) : (
            scenes.map((scene) => (
              <div key={scene.id} className="scene-card">
                <div className="scene-header">
                  <h3>
                    场景 {scene.sceneNumber}: {scene.title}
                  </h3>
                  <div className="scene-actions">
                    <button onClick={() => handleEditScene(scene)} className="btn-small">
                      编辑
                    </button>
                    <button
                      onClick={() => loadSceneVersions(scene.id)}
                      className="btn-small"
                    >
                      版本 (v{scene.version})
                    </button>
                    <button
                      onClick={() => handleDeleteScene(scene.id)}
                      className="btn-small btn-danger"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="scene-body">
                  {scene.description && (
                    <p className="scene-description">{scene.description}</p>
                  )}
                  <p className="scene-duration">
                    预估时长: {formatDuration(scene.estimatedDuration)}
                  </p>

                  {scene.voiceoverText && (
                    <div className="scene-voiceover">
                      <strong>旁白:</strong>
                      <p>{scene.voiceoverText}</p>
                    </div>
                  )}

                  {scene.dialogueText && (
                    <div className="scene-dialogue">
                      <strong>对话:</strong>
                      <p>{scene.dialogueText}</p>
                    </div>
                  )}

                  {scene.notes && (
                    <div className="scene-notes">
                      <strong>备注:</strong>
                      <p>{scene.notes}</p>
                    </div>
                  )}
                </div>

                <div className="scene-footer">
                  <small>创建: {formatDate(scene.createdAt)}</small>
                  <small>更新: {formatDate(scene.updatedAt)}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Scene Form Modal */}
      {showSceneForm && (
        <div className="modal-overlay" onClick={() => setShowSceneForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingScene ? '编辑场景' : '新建场景'}</h2>
            <form onSubmit={editingScene ? handleUpdateScene : handleCreateScene}>
              <div className="form-group">
                <label>场景标题 *</label>
                <input
                  type="text"
                  value={sceneForm.title}
                  onChange={(e) => setSceneForm({ ...sceneForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>场景简介</label>
                <textarea
                  value={sceneForm.description}
                  onChange={(e) => setSceneForm({ ...sceneForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>预估时长（秒）</label>
                <input
                  type="number"
                  value={sceneForm.estimatedDuration}
                  onChange={(e) =>
                    setSceneForm({ ...sceneForm, estimatedDuration: parseInt(e.target.value) })
                  }
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>旁白文本</label>
                <textarea
                  value={sceneForm.voiceoverText}
                  onChange={(e) =>
                    setSceneForm({ ...sceneForm, voiceoverText: e.target.value })
                  }
                  rows={4}
                  placeholder="场景的旁白内容..."
                />
              </div>

              <div className="form-group">
                <label>对话文本</label>
                <textarea
                  value={sceneForm.dialogueText}
                  onChange={(e) => setSceneForm({ ...sceneForm, dialogueText: e.target.value })}
                  rows={4}
                  placeholder="角色对话内容..."
                />
              </div>

              <div className="form-group">
                <label>备注</label>
                <textarea
                  value={sceneForm.notes}
                  onChange={(e) => setSceneForm({ ...sceneForm, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowSceneForm(false);
                    setEditingScene(null);
                    resetSceneForm();
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  {editingScene ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Versions Modal */}
      {showVersions && (
        <div className="modal-overlay" onClick={() => setShowVersions(false)}>
          <div className="modal versions-modal" onClick={(e) => e.stopPropagation()}>
            <h2>故事版本历史</h2>
            <div className="versions-list">
              {storyVersions.length === 0 ? (
                <p>暂无版本历史</p>
              ) : (
                storyVersions.map((version) => (
                  <div key={version.id} className="version-item">
                    <div className="version-header">
                      <strong>版本 {version.version}</strong>
                      <small>{formatDate(version.updatedAt)}</small>
                    </div>
                    <div className="version-content">
                      {version.hook && (
                        <div>
                          <strong>Hook:</strong> {version.hook.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="form-actions">
              <button onClick={() => setShowVersions(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* Scene Versions Modal */}
      {selectedSceneForVersions && (
        <div className="modal-overlay" onClick={() => setSelectedSceneForVersions(null)}>
          <div className="modal versions-modal" onClick={(e) => e.stopPropagation()}>
            <h2>场景版本历史</h2>
            <div className="versions-list">
              {sceneVersions.length === 0 ? (
                <p>暂无版本历史</p>
              ) : (
                sceneVersions.map((version) => (
                  <div key={version.id} className="version-item">
                    <div className="version-header">
                      <strong>版本 {version.version}</strong>
                      <small>{formatDate(version.updatedAt)}</small>
                    </div>
                    <div className="version-content">
                      <div>
                        <strong>标题:</strong> {version.title}
                      </div>
                      {version.voiceoverText && (
                        <div>
                          <strong>旁白:</strong> {version.voiceoverText.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="form-actions">
              <button onClick={() => setSelectedSceneForVersions(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryEditorView;
