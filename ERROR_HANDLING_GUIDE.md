# 错误处理系统使用指南

本文档介绍了 AI 视频生成管理系统中统一的错误处理机制。

## 目录

- [后端错误处理](#后端错误处理)
- [前端错误处理](#前端错误处理)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)

## 后端错误处理

### 核心组件

#### 1. 错误处理中间件 (`backend/src/middleware/errorHandler.ts`)

**AppError 类**
```typescript
// 创建自定义错误
throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
```

**ErrorFactory 工厂函数**
```typescript
// 使用工厂函数创建常见错误
throw ErrorFactory.notFound('Project', projectId);
throw ErrorFactory.badRequest('Invalid input');
throw ErrorFactory.validationError('Name is required');
throw ErrorFactory.conflict('Project already exists');
throw ErrorFactory.serviceUnavailable('ComfyUI');
```

**asyncHandler 包装器**
```typescript
// 自动捕获异步路由中的错误
router.get('/', asyncHandler(async (req, res) => {
  const data = await service.getData();
  res.json(data);
}));
```

#### 2. 错误工具函数 (`backend/src/utils/errorUtils.ts`)

**RequestValidator - 请求验证**
```typescript
// 验证必需字段
RequestValidator.requireFields(req.body, ['name', 'type']);

// 验证数值范围
RequestValidator.validateRange(value, 1, 100, 'duration');

// 验证枚举值
RequestValidator.validateEnum(status, ['draft', 'active'], 'status');

// 验证正数
RequestValidator.validatePositive(duration, 'duration');
```

**ErrorHelper - 错误断言**
```typescript
// 检查资源是否存在
ErrorHelper.assertExists(project, 'Project', id);

// 检查条件
ErrorHelper.assert(user.isAdmin, 'Unauthorized', 403);
```

**ResponseHelper - 响应辅助**
```typescript
// 发送成功响应
ResponseHelper.success(res, data, 'Operation successful');

// 发送创建成功响应
ResponseHelper.created(res, newProject, 'Project created');

// 发送无内容响应
ResponseHelper.noContent(res);
```

**RetryHelper - 重试逻辑**
```typescript
// 使用指数退避重试
const result = await RetryHelper.withRetry(
  () => comfyuiService.generate(),
  { maxRetries: 3, initialDelay: 1000 }
);
```

### 标准化错误响应格式

所有错误响应遵循以下格式：

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project with id 123 not found",
    "details": {
      "additionalInfo": "..."
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/projects/123"
}
```

### 路由使用示例

```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { RequestValidator, ResponseHelper, ErrorHelper } from '../utils/errorUtils';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  // 验证输入
  RequestValidator.requireFields(req.body, ['name', 'duration']);
  RequestValidator.validatePositive(req.body.duration, 'duration');

  // 执行业务逻辑
  const project = await projectService.create(req.body);

  // 检查结果
  ErrorHelper.assertExists(project, 'Project');

  // 返回响应
  ResponseHelper.created(res, project, 'Project created successfully');
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const project = await projectService.getById(req.params.id);
  
  // 如果不存在，自动抛出 404 错误
  ErrorHelper.assertExists(project, 'Project', req.params.id);
  
  ResponseHelper.success(res, project);
}));
```

## 前端错误处理

### 核心组件

#### 1. Error Boundary (`frontend/src/components/ErrorBoundary.tsx`)

捕获 React 组件树中的 JavaScript 错误：

```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### 2. Error Context (`frontend/src/contexts/ErrorContext.tsx`)

提供全局错误处理和通知：

```tsx
import { useError } from '../contexts/ErrorContext';

function MyComponent() {
  const { showError, showSuccess } = useError();

  const handleAction = async () => {
    try {
      await api.doSomething();
      showSuccess('成功', '操作完成');
    } catch (error) {
      // API 错误会自动显示，这里可以添加额外处理
    }
  };
}
```

#### 3. API 错误拦截器 (`frontend/src/utils/errorHandler.ts`)

自动拦截和处理 API 错误：

```typescript
// 已在 api.ts 中自动设置
setupAxiosInterceptors(api);
```

#### 4. Toast 通知 (`frontend/src/components/Toast.tsx`)

显示用户友好的错误消息：

```tsx
import { useError } from '../contexts/ErrorContext';

function MyComponent() {
  const { showError, showSuccess, showWarning, showInfo } = useError();

  showError('错误', '操作失败');
  showSuccess('成功', '操作完成');
  showWarning('警告', '请注意');
  showInfo('提示', '信息');
}
```

#### 5. useApiCall Hook (`frontend/src/hooks/useApiCall.ts`)

简化 API 调用和错误处理：

```tsx
import { useApiCall } from '../hooks/useApiCall';
import { projectApi } from '../services/api';

function MyComponent() {
  const { data, loading, error, execute } = useApiCall(
    projectApi.create,
    {
      showSuccessToast: true,
      successMessage: '项目创建成功',
      retryable: true,
      maxRetries: 3,
    }
  );

  const handleCreate = async () => {
    const result = await execute({ name: 'New Project' });
    if (result) {
      // 处理成功结果
    }
  };

  return (
    <div>
      {loading && <p>加载中...</p>}
      {error && <p>错误: {error.message}</p>}
      <button onClick={handleCreate}>创建项目</button>
    </div>
  );
}
```

### API 辅助函数 (`frontend/src/utils/apiHelpers.ts`)

**安全 API 调用**
```typescript
import { safeApiCall } from '../utils/apiHelpers';

const data = await safeApiCall(() => projectApi.get(id));
```

**批量 API 调用**
```typescript
import { batchApiCalls } from '../utils/apiHelpers';

const results = await batchApiCalls([
  () => projectApi.get('1'),
  () => projectApi.get('2'),
], { continueOnError: true });
```

**轮询 API**
```typescript
import { pollApi } from '../utils/apiHelpers';

const result = await pollApi(
  () => keyframeApi.getStatus(id),
  (data) => data.status === 'completed',
  { interval: 2000, maxAttempts: 30 }
);
```

**文件下载**
```typescript
import { downloadFile } from '../utils/apiHelpers';

await downloadFile(
  () => shotApi.exportStoryboard(projectId, 'csv'),
  'storyboard.csv'
);
```

## 使用示例

### 后端路由完整示例

```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { RequestValidator, ResponseHelper, ErrorHelper, RetryHelper } from '../utils/errorUtils';
import { ProjectService } from '../services/ProjectService';

const router = Router();
const projectService = new ProjectService();

// 创建项目
router.post('/', asyncHandler(async (req, res) => {
  // 1. 验证输入
  RequestValidator.requireFields(req.body, ['name', 'type', 'targetDuration']);
  RequestValidator.validatePositive(req.body.targetDuration, 'targetDuration');
  RequestValidator.validateEnum(
    req.body.type,
    ['产品介绍', '剧情短片', 'MV'],
    'type'
  );

  // 2. 执行业务逻辑
  const project = await projectService.createProject(req.body);

  // 3. 返回响应
  ResponseHelper.created(res, project, 'Project created successfully');
}));

// 获取项目（带重试）
router.get('/:id', asyncHandler(async (req, res) => {
  const project = await RetryHelper.withRetry(
    () => projectService.getProject(req.params.id),
    { maxRetries: 3 }
  );

  ErrorHelper.assertExists(project, 'Project', req.params.id);
  ResponseHelper.success(res, project);
}));

// 删除项目
router.delete('/:id', asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id);
  ResponseHelper.noContent(res);
}));

export default router;
```

### 前端组件完整示例

```tsx
import React, { useState, useEffect } from 'react';
import { useApiCall } from '../hooks/useApiCall';
import { useError } from '../contexts/ErrorContext';
import { projectApi } from '../services/api';
import { safeApiCall } from '../utils/apiHelpers';

function ProjectManager() {
  const [projects, setProjects] = useState([]);
  const { showSuccess } = useError();

  // 使用 useApiCall Hook
  const createProject = useApiCall(projectApi.create, {
    showSuccessToast: true,
    successMessage: '项目创建成功',
  });

  const deleteProject = useApiCall(projectApi.delete, {
    showSuccessToast: true,
    successMessage: '项目删除成功',
  });

  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await safeApiCall(() => projectApi.list());
      setProjects(data?.projects || []);
    } catch (error) {
      // 错误会自动显示 toast
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreate = async () => {
    const result = await createProject.execute({
      name: 'New Project',
      type: '产品介绍',
      targetDuration: 60,
    });

    if (result) {
      loadProjects(); // 刷新列表
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个项目吗？')) {
      await deleteProject.execute(id);
      loadProjects(); // 刷新列表
    }
  };

  return (
    <div>
      <h1>项目管理</h1>
      
      <button onClick={handleCreate} disabled={createProject.loading}>
        {createProject.loading ? '创建中...' : '创建项目'}
      </button>

      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            {project.name}
            <button
              onClick={() => handleDelete(project.id)}
              disabled={deleteProject.loading}
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProjectManager;
```

## 最佳实践

### 后端

1. **始终使用 asyncHandler 包装异步路由**
   ```typescript
   router.get('/', asyncHandler(async (req, res) => { ... }));
   ```

2. **使用 ErrorFactory 创建标准错误**
   ```typescript
   throw ErrorFactory.notFound('Project', id);
   ```

3. **使用 RequestValidator 验证输入**
   ```typescript
   RequestValidator.requireFields(req.body, ['name']);
   ```

4. **使用 ResponseHelper 返回响应**
   ```typescript
   ResponseHelper.success(res, data);
   ```

5. **对外部服务调用使用重试逻辑**
   ```typescript
   await RetryHelper.withRetry(() => externalService.call());
   ```

### 前端

1. **使用 ErrorBoundary 包装应用**
   ```tsx
   <ErrorBoundary><App /></ErrorBoundary>
   ```

2. **使用 ErrorProvider 提供全局错误处理**
   ```tsx
   <ErrorProvider><App /></ErrorProvider>
   ```

3. **使用 useApiCall Hook 简化 API 调用**
   ```typescript
   const { execute, loading, error } = useApiCall(api.method);
   ```

4. **使用 safeApiCall 包装 API 调用**
   ```typescript
   const data = await safeApiCall(() => api.getData());
   ```

5. **对长时间运行的操作使用轮询**
   ```typescript
   await pollApi(() => api.getStatus(), (data) => data.done);
   ```

6. **显式处理关键错误**
   ```typescript
   try {
     await criticalOperation();
   } catch (error) {
     showError('严重错误', '操作失败，请联系管理员');
   }
   ```

## 错误代码参考

### 常见错误代码

- `RESOURCE_NOT_FOUND` (404) - 资源不存在
- `BAD_REQUEST` (400) - 请求参数错误
- `VALIDATION_ERROR` (400) - 数据验证失败
- `CONFLICT` (409) - 操作冲突
- `INTERNAL_ERROR` (500) - 服务器内部错误
- `SERVICE_UNAVAILABLE` (503) - 服务不可用
- `REQUEST_TIMEOUT` (408) - 请求超时
- `NETWORK_ERROR` (0) - 网络错误

### 数据库错误代码

- `DATABASE_ERROR` (400) - 数据库查询失败
- `DUPLICATE_ENTRY` (409) - 唯一约束违反
- `FOREIGN_KEY_VIOLATION` (400) - 外键约束违反

## 调试技巧

1. **查看浏览器控制台** - 所有错误都会记录到控制台
2. **检查网络标签** - 查看 API 请求和响应
3. **使用开发环境** - 开发环境会显示更详细的错误信息
4. **查看服务器日志** - 后端错误会记录到服务器控制台

## 总结

统一的错误处理系统提供了：

- ✅ 标准化的错误响应格式
- ✅ 自动错误捕获和日志记录
- ✅ 用户友好的错误消息
- ✅ 自动重试机制
- ✅ 全局错误通知
- ✅ 类型安全的错误处理

遵循本指南可以确保应用程序具有一致、可靠的错误处理机制。
