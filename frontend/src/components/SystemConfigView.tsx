import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemConfigApi, SystemConfig, ValidationResult } from '../services/api';
import './SystemConfigView.css';

interface AllValidationResults {
  comfyui: ValidationResult;
  poeApi: ValidationResult;
  ffmpeg: ValidationResult;
  storage: ValidationResult;
}

const SystemConfigView = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    comfyuiBaseUrl: '',
    comfyuiTimeout: 300,
    poeApiKey: '',
    poeModel: 'gpt-5.1',
    poeApiUrl: 'https://api.poe.com/v1/chat/completions',
    storageBasePath: './storage',
    ffmpegPath: 'ffmpeg',
  });

  // Validation states
  const [validating, setValidating] = useState({
    comfyui: false,
    poe: false,
    ffmpeg: false,
    storage: false,
    all: false,
  });

  const [validationResults, setValidationResults] = useState<Partial<AllValidationResults>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await systemConfigApi.get();
      const data = response.data;
      
      setConfig(data);
      setFormData({
        comfyuiBaseUrl: data.comfyuiBaseUrl,
        comfyuiTimeout: data.comfyuiTimeout,
        poeApiKey: '', // Don't populate masked key
        poeModel: data.poeModel,
        poeApiUrl: data.poeApiUrl,
        storageBasePath: data.storageBasePath,
        ffmpegPath: data.ffmpegPath,
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Only send non-empty poeApiKey
      const updates = { ...formData };
      if (!updates.poeApiKey || updates.poeApiKey.startsWith('***')) {
        delete (updates as any).poeApiKey;
      }

      const response = await systemConfigApi.update(updates);
      const data = response.data;
      
      setConfig(data);
      setSuccessMessage('配置保存成功！');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const validateComfyUI = async () => {
    try {
      setValidating({ ...validating, comfyui: true });
      setValidationResults({ ...validationResults, comfyui: undefined });

      const response = await systemConfigApi.validateComfyUI(formData.comfyuiBaseUrl);
      setValidationResults({ ...validationResults, comfyui: response.data });
    } catch (err: any) {
      setValidationResults({
        ...validationResults,
        comfyui: { valid: false, message: '测试连接失败' },
      });
    } finally {
      setValidating({ ...validating, comfyui: false });
    }
  };

  const validatePoeAPI = async () => {
    try {
      setValidating({ ...validating, poe: true });
      setValidationResults({ ...validationResults, poeApi: undefined });

      const response = await systemConfigApi.validatePoeAPI(
        formData.poeApiKey || undefined,
        formData.poeApiUrl
      );
      setValidationResults({ ...validationResults, poeApi: response.data });
    } catch (err: any) {
      setValidationResults({
        ...validationResults,
        poeApi: { valid: false, message: '测试连接失败' },
      });
    } finally {
      setValidating({ ...validating, poe: false });
    }
  };

  const validateFFmpeg = async () => {
    try {
      setValidating({ ...validating, ffmpeg: true });
      setValidationResults({ ...validationResults, ffmpeg: undefined });

      const response = await systemConfigApi.validateFFmpeg(formData.ffmpegPath);
      setValidationResults({ ...validationResults, ffmpeg: response.data });
    } catch (err: any) {
      setValidationResults({
        ...validationResults,
        ffmpeg: { valid: false, message: '测试失败' },
      });
    } finally {
      setValidating({ ...validating, ffmpeg: false });
    }
  };

  const validateStorage = async () => {
    try {
      setValidating({ ...validating, storage: true });
      setValidationResults({ ...validationResults, storage: undefined });

      const response = await systemConfigApi.validateStorage(formData.storageBasePath);
      setValidationResults({ ...validationResults, storage: response.data });
    } catch (err: any) {
      setValidationResults({
        ...validationResults,
        storage: { valid: false, message: '测试失败' },
      });
    } finally {
      setValidating({ ...validating, storage: false });
    }
  };

  const validateAll = async () => {
    try {
      setValidating({ ...validating, all: true });
      setValidationResults({});

      const response = await systemConfigApi.validateAll();
      const data = response.data;
      
      setValidationResults(data.results);
      
      if (data.valid) {
        setSuccessMessage('所有配置验证通过！');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError('验证配置失败');
    } finally {
      setValidating({ ...validating, all: false });
    }
  };

  const renderValidationResult = (result?: ValidationResult) => {
    if (!result) return null;

    return (
      <div className={`validation-result ${result.valid ? 'success' : 'error'}`}>
        <span className="validation-icon">{result.valid ? '✓' : '✗'}</span>
        <span className="validation-message">{result.message}</span>
      </div>
    );
  };

  if (loading) {
    return <div className="system-config-view loading">加载配置中...</div>;
  }

  return (
    <div className="system-config-view">
      <div className="header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h1>系统配置</h1>
        <button
          className="btn-primary"
          onClick={validateAll}
          disabled={validating.all}
        >
          {validating.all ? '验证中...' : '验证所有配置'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <form onSubmit={handleSave} className="config-form">
        {/* ComfyUI Configuration */}
        <section className="config-section">
          <h2>ComfyUI 配置</h2>
          <p className="section-description">
            配置 ComfyUI 服务器连接，用于图像和视频生成
          </p>

          <div className="form-group">
            <label htmlFor="comfyuiBaseUrl">
              ComfyUI 服务器地址 *
            </label>
            <div className="input-with-button">
              <input
                type="text"
                id="comfyuiBaseUrl"
                value={formData.comfyuiBaseUrl}
                onChange={(e) =>
                  setFormData({ ...formData, comfyuiBaseUrl: e.target.value })
                }
                placeholder="http://localhost:8188"
                required
              />
              <button
                type="button"
                className="btn-test"
                onClick={validateComfyUI}
                disabled={validating.comfyui}
              >
                {validating.comfyui ? '测试中...' : '测试连接'}
              </button>
            </div>
            {renderValidationResult(validationResults.comfyui)}
            <small>ComfyUI API 的基础 URL</small>
          </div>

          <div className="form-group">
            <label htmlFor="comfyuiTimeout">
              超时时间（秒）*
            </label>
            <input
              type="number"
              id="comfyuiTimeout"
              value={formData.comfyuiTimeout}
              onChange={(e) =>
                setFormData({ ...formData, comfyuiTimeout: parseInt(e.target.value) })
              }
              min="1"
              max="3600"
              required
            />
            <small>生成任务的最大等待时间</small>
          </div>
        </section>

        {/* Poe API Configuration */}
        <section className="config-section">
          <h2>Poe API 配置（可选）</h2>
          <p className="section-description">
            配置 Poe API 用于 LLM 辅助生成功能（故事大纲、脚本优化等）
          </p>

          <div className="form-group">
            <label htmlFor="poeApiKey">
              API Key
            </label>
            <div className="input-with-button">
              <input
                type="password"
                id="poeApiKey"
                value={formData.poeApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, poeApiKey: e.target.value })
                }
                placeholder={config?.poeApiKey ? '***已配置' : '输入 API Key'}
              />
              <button
                type="button"
                className="btn-test"
                onClick={validatePoeAPI}
                disabled={validating.poe}
              >
                {validating.poe ? '测试中...' : '测试连接'}
              </button>
            </div>
            {renderValidationResult(validationResults.poeApi)}
            <small>留空则不使用 LLM 辅助功能</small>
          </div>

          <div className="form-group">
            <label htmlFor="poeModel">
              模型名称
            </label>
            <input
              type="text"
              id="poeModel"
              value={formData.poeModel}
              onChange={(e) =>
                setFormData({ ...formData, poeModel: e.target.value })
              }
              placeholder="gpt-5.1"
            />
            <small>使用的 LLM 模型名称</small>
          </div>

          <div className="form-group">
            <label htmlFor="poeApiUrl">
              API URL
            </label>
            <input
              type="text"
              id="poeApiUrl"
              value={formData.poeApiUrl}
              onChange={(e) =>
                setFormData({ ...formData, poeApiUrl: e.target.value })
              }
              placeholder="https://api.poe.com/v1/chat/completions"
            />
            <small>Poe API 端点地址</small>
          </div>
        </section>

        {/* File Storage Configuration */}
        <section className="config-section">
          <h2>文件存储配置</h2>
          <p className="section-description">
            配置生成文件的存储路径
          </p>

          <div className="form-group">
            <label htmlFor="storageBasePath">
              存储路径 *
            </label>
            <div className="input-with-button">
              <input
                type="text"
                id="storageBasePath"
                value={formData.storageBasePath}
                onChange={(e) =>
                  setFormData({ ...formData, storageBasePath: e.target.value })
                }
                placeholder="./storage"
                required
              />
              <button
                type="button"
                className="btn-test"
                onClick={validateStorage}
                disabled={validating.storage}
              >
                {validating.storage ? '测试中...' : '测试路径'}
              </button>
            </div>
            {renderValidationResult(validationResults.storage)}
            <small>生成的图片和视频文件存储位置</small>
          </div>
        </section>

        {/* FFmpeg Configuration */}
        <section className="config-section">
          <h2>FFmpeg 配置</h2>
          <p className="section-description">
            配置 FFmpeg 用于视频处理和合成
          </p>

          <div className="form-group">
            <label htmlFor="ffmpegPath">
              FFmpeg 路径 *
            </label>
            <div className="input-with-button">
              <input
                type="text"
                id="ffmpegPath"
                value={formData.ffmpegPath}
                onChange={(e) =>
                  setFormData({ ...formData, ffmpegPath: e.target.value })
                }
                placeholder="ffmpeg"
                required
              />
              <button
                type="button"
                className="btn-test"
                onClick={validateFFmpeg}
                disabled={validating.ffmpeg}
              >
                {validating.ffmpeg ? '测试中...' : '测试 FFmpeg'}
              </button>
            </div>
            {renderValidationResult(validationResults.ffmpeg)}
            <small>FFmpeg 可执行文件路径（如已添加到 PATH，填写 "ffmpeg" 即可）</small>
          </div>
        </section>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/')}
          >
            取消
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </form>

      {config && (
        <div className="config-info">
          <small>最后更新: {new Date(config.updatedAt).toLocaleString('zh-CN')}</small>
        </div>
      )}
    </div>
  );
};

export default SystemConfigView;
