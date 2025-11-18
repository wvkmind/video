import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * 标准化错误响应接口
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 常见错误类型的工厂函数
 */
export class ErrorFactory {
  static notFound(resource: string, id?: string): AppError {
    return new AppError(
      404,
      'RESOURCE_NOT_FOUND',
      id ? `${resource} with id ${id} not found` : `${resource} not found`
    );
  }

  static badRequest(message: string, details?: any): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static validationError(message: string, details?: any): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static conflict(message: string, details?: any): AppError {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static internalError(message: string, details?: any): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message, details);
  }

  static serviceUnavailable(service: string, message?: string): AppError {
    return new AppError(
      503,
      'SERVICE_UNAVAILABLE',
      message || `${service} service is unavailable`,
      { service }
    );
  }

  static timeout(operation: string): AppError {
    return new AppError(
      408,
      'REQUEST_TIMEOUT',
      `Operation ${operation} timed out`
    );
  }
}

/**
 * 错误日志记录器
 */
class ErrorLogger {
  private static formatError(error: Error | AppError, req: Request): string {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const ip = req.ip;
    
    let errorInfo = `[${timestamp}] ${method} ${path} - IP: ${ip}\n`;
    errorInfo += `Error: ${error.message}\n`;
    
    if (error instanceof AppError) {
      errorInfo += `Code: ${error.code}\n`;
      errorInfo += `Status: ${error.statusCode}\n`;
      if (error.details) {
        errorInfo += `Details: ${JSON.stringify(error.details, null, 2)}\n`;
      }
    }
    
    if (error.stack) {
      errorInfo += `Stack: ${error.stack}\n`;
    }
    
    return errorInfo;
  }

  static logError(error: Error | AppError, req: Request): void {
    const errorLog = this.formatError(error, req);
    
    // 根据错误类型选择日志级别
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        console.error('❌ Server Error:', errorLog);
      } else if (error.statusCode >= 400) {
        console.warn('⚠️  Client Error:', errorLog);
      }
    } else {
      console.error('❌ Unexpected Error:', errorLog);
    }
  }
}

/**
 * 错误处理中间件
 * 捕获所有错误并返回标准化的错误响应
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 记录错误日志
  ErrorLogger.logError(err, req);

  // 默认错误响应
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // 处理自定义应用错误
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // 处理 TypeORM 查询错误
  else if (err instanceof QueryFailedError) {
    statusCode = 400;
    errorCode = 'DATABASE_ERROR';
    message = 'Database query failed';
    
    // 提取有用的错误信息
    const queryError = err as any;
    if (queryError.code === '23505') {
      // 唯一约束违反
      statusCode = 409;
      errorCode = 'DUPLICATE_ENTRY';
      message = 'A record with this value already exists';
    } else if (queryError.code === '23503') {
      // 外键约束违反
      statusCode = 400;
      errorCode = 'FOREIGN_KEY_VIOLATION';
      message = 'Referenced record does not exist';
    }
    
    // 在开发环境中包含更多细节
    if (process.env.NODE_ENV === 'development') {
      details = {
        query: queryError.query,
        parameters: queryError.parameters,
      };
    }
  }
  // 处理验证错误
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  }
  // 处理 JSON 解析错误
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // 在开发环境中包含堆栈跟踪
  if (process.env.NODE_ENV === 'development' && err.stack) {
    (errorResponse.error as any).stack = err.stack;
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found 处理中间件
 * 处理未匹配到任何路由的请求
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const errorResponse: ErrorResponse = {
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(404).json(errorResponse);
};

/**
 * 异步路由处理器包装器
 * 自动捕获异步函数中的错误并传递给错误处理中间件
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
