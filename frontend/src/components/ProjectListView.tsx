import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi, Project, CreateProjectData } from '../services/api';
import './ProjectListView.css';

const ProjectListView = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    type: '',
    targetDuration: 60,
    targetStyle: '',
    targetAudience: '',
    notes: '',
  });

  useEffect(() => {
    loadProjects();
  }, [currentPage, searchTerm, statusFilter, typeFilter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectApi.list({
        page: currentPage,
        limit: 12,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      setProjects(response.data.projects);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectApi.create(formData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        type: '',
        targetDuration: 60,
        targetStyle: '',
        targetAudience: '',
        notes: '',
      });
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '创建项目失败');
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!confirm('确定要复制这个项目吗？')) return;
    try {
      await projectApi.duplicate(id);
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '复制项目失败');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('确定要归档这个项目吗？')) return;
    try {
      await projectApi.archive(id);
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '归档项目失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个项目吗？此操作不可恢复！')) return;
    try {
      await projectApi.delete(id);
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '删除项目失败');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: '草稿',
      in_progress: '进行中',
      completed: '已完成',
      archived: '已归档',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    return `status-badge status-${status}`;
  };

  return (
    <div className="project-list-view">
      <div className="header">
        <h1>项目总览</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/system/config')}>
            ⚙️ 系统配置
          </button>
          <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
            + 新建项目
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters">
        <input
          type="text"
          placeholder="搜索项目..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="search-input"
        />
        
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="filter-select"
        >
          <option value="">所有状态</option>
          <option value="draft">草稿</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="archived">已归档</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="filter-select"
        >
          <option value="">所有类型</option>
          <option value="产品介绍">产品介绍</option>
          <option value="剧情短片">剧情短片</option>
          <option value="MV">MV</option>
          <option value="教程">教程</option>
        </select>

        <div className="view-toggle">
          <button
            className={viewMode === 'card' ? 'active' : ''}
            onClick={() => setViewMode('card')}
          >
            卡片
          </button>
          <button
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => setViewMode('table')}
          >
            表格
          </button>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && <div className="loading">加载中...</div>}
      {error && <div className="error">{error}</div>}

      {/* Projects Display */}
      {!loading && !error && (
        <>
          {viewMode === 'card' ? (
            <div className="projects-grid">
              {projects.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="card-header">
                    <h3 onClick={() => navigate(`/projects/${project.id}/story`)}>
                      {project.name}
                    </h3>
                    <span className={getStatusClass(project.status)}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  <div className="card-body">
                    <p className="project-type">{project.type}</p>
                    <p className="project-duration">
                      目标时长: {formatDuration(project.targetDuration)}
                    </p>
                    {project.targetStyle && (
                      <p className="project-style">风格: {project.targetStyle}</p>
                    )}
                    {project.targetAudience && (
                      <p className="project-audience">受众: {project.targetAudience}</p>
                    )}
                  </div>
                  <div className="card-footer">
                    <div className="dates">
                      <small>创建: {formatDate(project.createdAt)}</small>
                      <small>更新: {formatDate(project.updatedAt)}</small>
                    </div>
                    <div className="actions">
                      <button
                        onClick={() => navigate(`/projects/${project.id}/story`)}
                        className="btn-small"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDuplicate(project.id)}
                        className="btn-small"
                      >
                        复制
                      </button>
                      {project.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(project.id)}
                          className="btn-small"
                        >
                          归档
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="btn-small btn-danger"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="projects-table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>类型</th>
                  <th>目标时长</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>最近修改</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td
                      className="project-name"
                      onClick={() => navigate(`/projects/${project.id}/story`)}
                    >
                      {project.name}
                    </td>
                    <td>{project.type}</td>
                    <td>{formatDuration(project.targetDuration)}</td>
                    <td>
                      <span className={getStatusClass(project.status)}>
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td>{formatDate(project.createdAt)}</td>
                    <td>{formatDate(project.updatedAt)}</td>
                    <td className="actions">
                      <button
                        onClick={() => navigate(`/projects/${project.id}/story`)}
                        className="btn-small"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDuplicate(project.id)}
                        className="btn-small"
                      >
                        复制
                      </button>
                      {project.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(project.id)}
                          className="btn-small"
                        >
                          归档
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="btn-small btn-danger"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <span>
                第 {currentPage} / {totalPages} 页 (共 {total} 个项目)
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Project Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>新建项目</h2>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>项目名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>项目类型 *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="">请选择</option>
                  <option value="产品介绍">产品介绍</option>
                  <option value="剧情短片">剧情短片</option>
                  <option value="MV">MV</option>
                  <option value="教程">教程</option>
                </select>
              </div>

              <div className="form-group">
                <label>目标时长（秒）*</label>
                <input
                  type="number"
                  value={formData.targetDuration}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDuration: parseInt(e.target.value) })
                  }
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>目标风格</label>
                <input
                  type="text"
                  value={formData.targetStyle}
                  onChange={(e) => setFormData({ ...formData, targetStyle: e.target.value })}
                  placeholder="例如：电影感、卡通风格"
                />
              </div>

              <div className="form-group">
                <label>主要受众</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="例如：年轻人、儿童"
                />
              </div>

              <div className="form-group">
                <label>备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectListView;
