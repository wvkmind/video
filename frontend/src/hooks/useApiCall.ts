import { useState, useCallback } from 'react';
import { ApiError, RetryHelper } from '../utils/errorHandler';
import { useError } from '../contexts/ErrorContext';

interface UseApiCallOptions {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  retryable?: boolean;
  maxRetries?: number;
}

interface UseApiCallResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * API 调用 Hook，提供加载状态、错误处理和重试功能
 */
export function useApiCall<T>(
  apiFunction: (...args: any[]) => Promise<any>,
  options: UseApiCallOptions = {}
): UseApiCallResult<T> {
  const {
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    retryable = false,
    maxRetries = 3,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const { showError, showSuccess } = useError();

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        let result;

        if (retryable) {
          // 使用重试逻辑
          result = await RetryHelper.withRetry(
            () => apiFunction(...args),
            { maxRetries }
          );
        } else {
          // 直接调用
          result = await apiFunction(...args);
        }

        // 提取数据（处理不同的响应格式）
        const responseData = result?.data?.data || result?.data || result;
        setData(responseData);

        // 显示成功消息
        if (showSuccessToast && successMessage) {
          showSuccess('成功', successMessage);
        }

        return responseData;
      } catch (err: any) {
        const apiError = err instanceof ApiError ? err : new ApiError(
          500,
          'UNKNOWN_ERROR',
          err.message || '发生未知错误'
        );

        setError(apiError);

        // 显示错误消息（如果未被全局拦截器处理）
        if (showErrorToast && !apiError.isRetryable()) {
          showError(
            `错误 (${apiError.code})`,
            apiError.getUserMessage()
          );
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, retryable, maxRetries, showErrorToast, showSuccessToast, successMessage, showError, showSuccess]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

/**
 * 简化的 API 调用 Hook，用于立即执行的场景
 */
export function useApiCallImmediate<T>(
  apiFunction: (...args: any[]) => Promise<any>,
  args: any[] = [],
  options: UseApiCallOptions = {}
): UseApiCallResult<T> {
  const result = useApiCall<T>(apiFunction, options);

  // 立即执行
  useState(() => {
    result.execute(...args);
  });

  return result;
}
