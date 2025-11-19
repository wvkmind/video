import React, { useState, useRef } from 'react';
import './AudioImporter.css';

interface AudioImporterProps {
  projectId: string;
  audioType: 'voiceover' | 'bgm';
  currentAudioPath?: string;
  onUploadSuccess: (audioPath: string, duration?: number) => void;
  onDelete?: () => void;
}

export const AudioImporter: React.FC<AudioImporterProps> = ({
  projectId,
  audioType,
  currentAudioPath,
  onUploadSuccess,
  onDelete,
}) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/aac', 'audio/ogg', 'audio/flac'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|aac|ogg|flac)$/i)) {
      setError('请选择有效的音频文件（MP3, WAV, AAC, OGG, FLAC）');
      return;
    }

    // 验证文件大小（50MB）
    if (file.size > 50 * 1024 * 1024) {
      setError('文件大小不能超过 50MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('audioType', audioType);

      const response = await fetch(`/api/projects/${projectId}/audio/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '上传失败');
      }

      const data = await response.json();
      onUploadSuccess(data.audioPath, data.duration);
    } catch (err: any) {
      setError(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个音频文件吗？')) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/audio/${audioType}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '删除失败');
      }

      if (onDelete) {
        onDelete();
      }
    } catch (err: any) {
      setError(err.message || '删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const getAudioTypeLabel = () => {
    return audioType === 'voiceover' ? '旁白音频' : '背景音乐';
  };

  return (
    <div className="audio-importer">
      <div className="importer-header">
        <h4>{getAudioTypeLabel()}</h4>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {currentAudioPath ? (
        <div className="current-audio">
          <div className="audio-info">
            <span className="audio-icon">🎵</span>
            <span className="audio-name">{currentAudioPath.split('/').pop()}</span>
          </div>
          <div className="audio-actions">
            <button
              className="btn-delete"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '删除中...' : '删除'}
            </button>
            <button
              className="btn-replace"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              替换
            </button>
          </div>
        </div>
      ) : (
        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.aac,.ogg,.flac"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            className="btn-upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="spinner">⏳</span>
                上传中...
              </>
            ) : (
              <>
                <span className="upload-icon">📁</span>
                选择{getAudioTypeLabel()}
              </>
            )}
          </button>
          <p className="upload-hint">
            支持 MP3, WAV, AAC, OGG, FLAC 格式，最大 50MB
          </p>
        </div>
      )}
    </div>
  );
};
