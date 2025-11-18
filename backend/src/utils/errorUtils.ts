import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorFactory } from '../middleware/errorHandler';

/**
 * 验证请求参数的辅助函数
 */
export class RequestValidator {
  /**
   * 验证必需的字段是否存在
   */
  static requireFields(
    data: any,
    fields: string[],
    fieldName: string = 'body'
  ): void {
    const missing: string[] = [];
    
    for (const field of fields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      throw ErrorFactory.validationError(
        `Missing required fields in ${fieldName}`,
        { missingFields: missing }
      );
    }
  }

  /**
   * 验证数值范围
   */
  static validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void {
    if (value < min || value > max) {
      throw ErrorFactory.validationError(
        `${fieldName} must be between ${min} and ${max}`,
        { value, min, max }
      );
    }
  }

  /**
   * 验证枚举值
   */
  static validateEnum<T>(
    value: T,
    allowedValues: T[],
    fieldName: string
  ): void {
    if (!allowedValues.includes(value)) {
      throw ErrorFactory.validationError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        { value, allowedValues }
      );
    }
  }

  /**
   * 验证 UUID 格式
   */
  static validateUUID(value: string, fieldName: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw ErrorFactory.validationError(
        `${fieldName} must be a valid UUID`,
        { value }
      );
    }
  }

  /**
   * 验证正数
   */
  static validatePositive(value: number, fieldName: string): void {
    if (value <= 0) {
      throw ErrorFactory.validationError(
        `${fieldName} must be a positive number`,
        { value }
      );
    }
  }

  /**
   * 验证非负数
   */
  static validateNonNegative(value: number, fieldName: string): void {
    if (value < 0) {
      throw ErrorFactory.validationError(
        `${fieldName} must be a non-negative number`,
        { value }
      );
    }
  }
}

/**
 * 重试逻辑辅助函数
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
      retryableErrors?: string[];
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
    } = options;

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // 检查是否是可重试的错误
        const isRetryable = retryableErrors.some(
          (code) => error.code === code || error.message?.includes(code)
        );

        // 如果不是可重试的错误或已达到最大重试次数，则抛出错误
        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // 等待后重试
        console.warn(
          `⚠️  Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`
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
 * 响应辅助函数
 */
export class ResponseHelper {
  /**
   * 发送成功响应
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      ...(message && { message }),
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 发送创建成功响应
   */
  static created<T>(res: Response, data: T, message?: string): void {
    this.success(res, data, message, 201);
  }

  /**
   * 发送无内容响应
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }
}

/**
 * 错误处理辅助函数
 */
export class ErrorHelper {
  /**
   * 包装可能抛出错误的操作
   */
  static async tryCatch<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    errorCode?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        500,
        errorCode || 'OPERATION_FAILED',
        errorMessage,
        { originalError: error.message }
      );
    }
  }

  /**
   * 检查资源是否存在，不存在则抛出 404 错误
   */
  static assertExists<T>(
    resource: T | null | undefined,
    resourceName: string,
    id?: string
  ): asserts resource is T {
    if (!resource) {
      throw ErrorFactory.notFound(resourceName, id);
    }
  }

  /**
   * 检查条件，不满足则抛出错误
   */
  static assert(
    condition: boolean,
    message: string,
    statusCode: number = 400,
    code: string = 'ASSERTION_FAILED'
  ): asserts condition {
    if (!condition) {
      throw new AppError(statusCode, code, message);
    }
  }
}
