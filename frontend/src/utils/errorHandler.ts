import { AxiosError } from 'axios';

/**
 * API 错误响应接口
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

/**
 * 自定义 API 错误类
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any,
    public path?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * 从 Axios 错误创建 ApiError
   */
  static fromAxiosError(error: AxiosError<ApiErrorResponse>): ApiError {
    if (error.response?.data?.error) {
      const { code, message, details } = error.response.data.error;
      return new ApiError(
        error.response.status,
        code,
        message,
        details,
        error.response.data.path
      );
    }

    // 处理网络错误
    if (error.code === 'ERR_NETWORK') {
      return new ApiError(
        0,
        'NETWORK_ERROR',
        '无法连接到服务器，请检查网络连接'
      );
    }

    // 处理超时错误
    if (error.code === 'ECONNABORTED') {
      return new ApiError(
        408,
        'REQUEST_TIMEOUT',
        '请求超时，请稍后重试'
      );
    }

    // 默认错误
    return new ApiError(
      error.response?.status || 500,
      'UNKNOWN_ERROR',
      error.message || '发生未知错误'
    );
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    // 根据错误代码返回友好的消息
    const friendlyMessages: { [key: string]: string } = {
      NETWORK_ERROR: '无法连接到服务器，请检查网络连接',
      REQUEST_TIMEOUT: '请求超时，请稍后重试',
      RESOURCE_NOT_FOUND: '请求的资源不存在',
      VALIDATION_ERROR: '输入数据验证失败',
      UNAUTHORIZED: '未授权，请先登录',
      FORBIDDEN: '没有权限执行此操作',
      CONFLICT: '操作冲突，请刷新后重试',
      SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
      INTERNAL_ERROR: '服务器内部错误，请稍后重试',
    };

    return friendlyMessages[this.code] || this.message;
  }

  /**
   * 判断错误是否可重试
   */
  isRetryable(): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'REQUEST_TIMEOUT',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_ERROR',
    ];
    return retryableCodes.includes(this.code) || this.statusCode >= 500;
  }
}

/**
 * 错误通知管理器
 */
export class ErrorNotifier {
  private static listeners: Array<(error: ApiError) => void> = [];

  /**
   * 订阅错误通知
   */
  static subscribe(listener: (error: ApiError) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 发送错误通知
   */
  static notify(error: ApiError): void {
    this.listeners.forEach((listener) => listener(error));
  }
}

/**
 * 重试辅助函数
 */
export class RetryHelper {
  /**
   * 使用指数退避重试异步操作
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
      shouldRetry?: (error: ApiError) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      shouldRetry = (error: ApiError) => error.isRetryable(),
    } = options;

    let lastError: ApiError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error instanceof ApiError 
          ? error 
          : ApiError.fromAxiosError(error);

        // 如果不应该重试或已达到最大重试次数，则抛出错误
        if (!shouldRetry(lastError) || attempt === maxRetries) {
          throw lastError;
        }

        // 等待后重试
        console.warn(
          `⚠️  请求失败 (尝试 ${attempt + 1}/${maxRetries + 1}), ${delay}ms 后重试...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));

        // 增加延迟时间（指数退避）
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError!;
  }
}

/**
 * 设置 Axios 拦截器
 */
export function setupAxiosInterceptors(axiosInstance: any): void {
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    (config: any) => {
      // 可以在这里添加认证 token 等
      return config;
    },
    (error: any) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response: any) => {
      return response;
    },
    (error: AxiosError<ApiErrorResponse>) => {
      const apiError = ApiError.fromAxiosError(error);
      
      // 记录错误
      console.error('❌ API Error:', {
        code: apiError.code,
        message: apiError.message,
        statusCode: apiError.statusCode,
        path: apiError.path,
        details: apiError.details,
      });

      // 发送错误通知
      ErrorNotifier.notify(apiError);

      return Promise.reject(apiError);
    }
  );
}

/**
 * 错误日志记录器
 */
export class ErrorLogger {
  /**
   * 记录错误到控制台
   */
  static log(error: Error | ApiError, context?: string): void {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';
    
    if (error instanceof ApiError) {
      console.error(`${prefix} [${timestamp}] API Error:`, {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        path: error.path,
        details: error.details,
      });
    } else {
      console.error(`${prefix} [${timestamp}] Error:`, error);
    }
  }

  /**
   * 记录错误到服务器（可选）
   */
  static async logToServer(_error: Error | ApiError, _context?: string): Promise<void> {
    try {
      // 这里可以实现将错误发送到服务器的逻辑
      // await axios.post('/api/logs/errors', {
      //   error: _error.message,
      //   stack: _error.stack,
      //   context: _context,
      //   timestamp: new Date().toISOString(),
      // });
    } catch (err) {
      console.error('Failed to log error to server:', err);
    }
  }
}
