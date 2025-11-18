import { ApiError } from './errorHandler';

/**
 * API 调用辅助函数
 * 提供统一的错误处理和数据提取
 */

/**
 * 安全地执行 API 调用并提取数据
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<any>,
  defaultValue: T | null = null
): Promise<T | null> {
  try {
    const response = await apiCall();
    // 处理不同的响应格式
    return response?.data?.data || response?.data || response || defaultValue;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      'API_CALL_FAILED',
      error instanceof Error ? error.message : '未知错误'
    );
  }
}

/**
 * 批量执行 API 调用
 */
export async function batchApiCalls<T>(
  apiCalls: Array<() => Promise<any>>,
  options: {
    continueOnError?: boolean;
    maxConcurrent?: number;
  } = {}
): Promise<Array<T | null>> {
  const { continueOnError = false, maxConcurrent = 5 } = options;
  const results: Array<T | null> = [];
  const errors: ApiError[] = [];

  // 分批执行
  for (let i = 0; i < apiCalls.length; i += maxConcurrent) {
    const batch = apiCalls.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async (apiCall) => {
      try {
        return await safeApiCall<T>(apiCall);
      } catch (error) {
        if (continueOnError) {
          errors.push(error as ApiError);
          return null;
        }
        throw error;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  if (errors.length > 0 && !continueOnError) {
    throw errors[0];
  }

  return results;
}

/**
 * 轮询 API 直到满足条件
 */
export async function pollApi<T>(
  apiCall: () => Promise<any>,
  condition: (data: T) => boolean,
  options: {
    interval?: number;
    maxAttempts?: number;
    timeout?: number;
  } = {}
): Promise<T> {
  const { interval = 1000, maxAttempts = 30, timeout = 30000 } = options;
  const startTime = Date.now();
  let attempts = 0;

  while (attempts < maxAttempts) {
    // 检查超时
    if (Date.now() - startTime > timeout) {
      throw new ApiError(
        408,
        'POLL_TIMEOUT',
        `轮询超时 (${timeout}ms)`
      );
    }

    try {
      const data = await safeApiCall<T>(apiCall);
      if (data && condition(data)) {
        return data;
      }
    } catch (error) {
      // 如果是可重试的错误，继续轮询
      if (error instanceof ApiError && !error.isRetryable()) {
        throw error;
      }
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new ApiError(
    408,
    'POLL_MAX_ATTEMPTS',
    `达到最大轮询次数 (${maxAttempts})`
  );
}

/**
 * 处理文件下载
 */
export async function downloadFile(
  apiCall: () => Promise<any>,
  filename: string
): Promise<void> {
  try {
    const response = await apiCall();
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new ApiError(
      500,
      'DOWNLOAD_FAILED',
      '文件下载失败'
    );
  }
}

/**
 * 处理文件上传
 */
export async function uploadFile(
  apiCall: (formData: FormData) => Promise<any>,
  file: File,
  additionalData?: Record<string, any>
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  try {
    return await safeApiCall(() => apiCall(formData));
  } catch (error) {
    throw new ApiError(
      500,
      'UPLOAD_FAILED',
      '文件上传失败'
    );
  }
}
