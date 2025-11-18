import React from 'react';
import { useError } from '../contexts/ErrorContext';
import { useApiCall } from '../hooks/useApiCall';
import { projectApi } from '../services/api';

/**
 * 错误处理演示组件
 * 用于测试和演示错误处理系统的各种功能
 */
export const ErrorHandlingDemo: React.FC = () => {
  const { showError, showSuccess, showWarning, showInfo } = useError();

  // 测试 API 调用
  const createProject = useApiCall(projectApi.create, {
    showSuccessToast: true,
    successMessage: '项目创建成功！',
  });

  // 测试各种 Toast 类型
  const handleShowSuccess = () => {
    showSuccess('成功', '这是一条成功消息');
  };

  const handleShowError = () => {
    showError('错误', '这是一条错误消息');
  };

  const handleShowWarning = () => {
    showWarning('警告', '这是一条警告消息');
  };

  const handleShowInfo = () => {
    showInfo('信息', '这是一条信息消息');
  };

  // 测试 API 错误（404）
  const handleTestNotFound = async () => {
    try {
      await projectApi.get('non-existent-id');
    } catch (error) {
      // 错误会自动显示
      console.log('Caught error:', error);
    }
  };

  // 测试 API 错误（验证错误）
  const handleTestValidationError = async () => {
    try {
      await createProject.execute({
        name: '', // 空名称会导致验证错误
        type: 'test',
        targetDuration: -1, // 负数会导致验证错误
      });
    } catch (error) {
      console.log('Caught validation error:', error);
    }
  };

  // 测试成功的 API 调用
  const handleTestSuccess = async () => {
    await createProject.execute({
      name: '测试项目',
      type: '产品介绍',
      targetDuration: 60,
    });
  };

  // 测试 React 错误边界
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error('测试 Error Boundary！');
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>错误处理系统演示</h1>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Toast 通知测试</h2>
        <div style={styles.buttonGroup}>
          <button onClick={handleShowSuccess} style={styles.button}>
            显示成功消息
          </button>
          <button onClick={handleShowError} style={styles.button}>
            显示错误消息
          </button>
          <button onClick={handleShowWarning} style={styles.button}>
            显示警告消息
          </button>
          <button onClick={handleShowInfo} style={styles.button}>
            显示信息消息
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>API 错误测试</h2>
        <div style={styles.buttonGroup}>
          <button onClick={handleTestNotFound} style={styles.button}>
            测试 404 错误
          </button>
          <button onClick={handleTestValidationError} style={styles.button}>
            测试验证错误
          </button>
          <button
            onClick={handleTestSuccess}
            style={styles.button}
            disabled={createProject.loading}
          >
            {createProject.loading ? '创建中...' : '测试成功调用'}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Error Boundary 测试</h2>
        <div style={styles.buttonGroup}>
          <button
            onClick={() => setShouldThrow(true)}
            style={{ ...styles.button, ...styles.dangerButton }}
          >
            触发 React 错误
          </button>
        </div>
        <p style={styles.note}>
          注意：点击此按钮会触发 React 错误边界，显示错误 UI
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>状态信息</h2>
        <div style={styles.info}>
          <p>
            <strong>加载中：</strong> {createProject.loading ? '是' : '否'}
          </p>
          {createProject.error && (
            <p style={styles.errorText}>
              <strong>错误：</strong> {createProject.error.message}
            </p>
          )}
          {createProject.data ? (
            <p style={styles.successText}>
              <strong>成功：</strong> 项目已创建
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '40px',
    color: '#333',
    textAlign: 'center',
  },
  section: {
    marginBottom: '40px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#555',
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#1976d2',
    color: 'white',
    transition: 'background-color 0.2s',
  },
  dangerButton: {
    backgroundColor: '#d32f2f',
  },
  note: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic',
  },
  info: {
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
  },
  errorText: {
    color: '#d32f2f',
  },
  successText: {
    color: '#4caf50',
  },
};

export default ErrorHandlingDemo;
