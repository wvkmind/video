# 代码简化和完善计划

## 目标
基于实际代码检查，简化冗余代码，完成未完全集成的功能。

---

## 第一阶段：清理和优化（预计1-2小时）

### 1.1 清理重复导入
**文件**: `frontend/src/components/StoryboardView.tsx`

**问题**: StatusSelector 被导入两次
```typescript
import StatusSelector from './StatusSelector';
import StatusSelector from './StatusSelector';  // 重复
```

**修复**: 删除重复行

### 1.2 清理重复导入
**文件**: `frontend/src/components/ShotCard.tsx`

**问题**: StatusSelector 被导入两次

**修复**: 删除重复行

### 1.3 统一错误处理使用
**检查**: 确保所有路由都使用 `asyncHandler`

**需要检查的文件**:
- `backend/src/routes/storyRoutes.ts`
- `backend/src/routes/sceneRoutes.ts`
- `backend/src/routes/shotRoutes.ts`
- `backend/src/routes/keyframeRoutes.ts`
- `backend/src/routes/clipRoutes.ts`
- `backend/src/routes/timelineRoutes.ts`

**修复**: 将所有异步路由包装在 `asyncHandler` 中

---

## 第二阶段：完成Task 36集成（预计2-3小时）

### 2.1 在StoryEditorView中集成修改确认

**文件**: `frontend/src/components/StoryEditorView.tsx`

**需要添加**:
```typescript
import { ModificationConfirmDialog } from './ModificationConfirmDialog';
import { useModificationConfirm } from '../hooks/useModificationConfirm';

// 在组件中
const { dialogProps, showConfirmDialog } = useModificationConfirm({
  entityType: 'story',
  entityId: projectId,
  entityName: story?.outline || 'Story',
  onConfirm: async (refreshDownstream) => {
    await handleSaveStory();
    if (refreshDownstream) {
      // TODO: 实现批量刷新逻辑
      console.log('批量刷新下游产物');
    }
  }
});

// 在保存按钮的onClick中
onClick={showConfirmDialog}

// 在render中
<ModificationConfirmDialog {...dialogProps} />
```

### 2.2 在StoryboardView中集成修改确认

**文件**: `frontend/src/components/StoryboardView.tsx`

**场景1**: 修改场景时
```typescript
const { dialogProps: sceneDialogProps, showConfirmDialog: showSceneConfirm } = 
  useModificationConfirm({
    entityType: 'scene',
    entityId: selectedScene?.id || '',
    entityName: selectedScene?.title || 'Scene',
    onConfirm: async (refreshDownstream) => {
      await handleSaveScene();
      if (refreshDownstream) {
        await regenerateSceneShots(selectedScene.id);
      }
    }
  });
```

**场景2**: 修改镜头时
```typescript
const { dialogProps: shotDialogProps, showConfirmDialog: showShotConfirm } = 
  useModificationConfirm({
    entityType: 'shot',
    entityId: selectedShot?.id || '',
    entityName: selectedShot?.shotId || 'Shot',
    onConfirm: async (refreshDownstream) => {
      await handleSaveShot();
      if (refreshDownstream) {
        await regenerateShotKeyframes(selectedShot.id);
      }
    }
  });
```

### 2.3 实现批量刷新逻辑

**新文件**: `frontend/src/utils/regenerationApi.ts`

```typescript
export async function regenerateSceneShots(sceneId: string): Promise<void> {
  // 获取场景下的所有镜头
  const shots = await api.get(`/api/scenes/${sceneId}/shots`);
  
  // 批量更新镜头状态为draft
  await api.put('/api/status/batch-status', {
    entityType: 'shot',
    entityIds: shots.data.map(s => s.id),
    status: 'draft'
  });
  
  // 可选：触发重新生成
  // for (const shot of shots.data) {
  //   await api.post(`/api/shots/${shot.id}/regenerate`);
  // }
}

export async function regenerateShotKeyframes(shotId: string): Promise<void> {
  // 获取镜头下的所有关键帧
  const keyframes = await api.get(`/api/shots/${shotId}/keyframes`);
  
  // 删除旧关键帧或标记为过期
  // 触发重新生成
  await api.post(`/api/shots/${shotId}/generate-keyframes`);
}
```

---

## 第三阶段：代码优化（预计2-3小时）

### 3.1 优化StatusService

**文件**: `backend/src/services/StatusService.ts`

**优化**: 减少重复代码

```typescript
private async updateEntityStatus<T extends { status: string }>(
  repository: any,
  entityId: string,
  newStatus: string,
  entityName: string
): Promise<void> {
  if (!isValidEntityStatus(newStatus)) {
    throw ErrorFactory.validationError(
      `Invalid status: ${newStatus}. Must be one of: draft, generated, locked`
    );
  }

  const entity = await repository.findById(entityId);
  ErrorHelper.assertExists(entity, entityName, entityId);

  if (!isValidEntityStatusTransition(entity.status, newStatus)) {
    throw ErrorFactory.badRequest(
      `Invalid status transition from ${entity.status} to ${newStatus}`
    );
  }

  await repository.update(entityId, { status: newStatus });
}

async updateStoryStatus(storyId: string, newStatus: string): Promise<void> {
  return this.updateEntityStatus(
    this.storyRepository,
    storyId,
    newStatus,
    'Story'
  );
}

// 类似地简化其他方法
```

### 3.2 优化DependencyService

**文件**: `backend/src/services/DependencyService.ts`

**优化**: 添加缓存和批量查询

```typescript
async getDependentEntities(
  entityType: 'story' | 'scene' | 'shot' | 'keyframe',
  entityId: string
): Promise<DependentEntity[]> {
  const dependents: DependentEntity[] = [];

  // 使用switch-case，但优化查询
  switch (entityType) {
    case 'story': {
      const scenes = await AppDataSource.getRepository(Scene)
        .createQueryBuilder('scene')
        .where('scene.projectId = :projectId', { projectId: entityId })
        .select(['scene.id', 'scene.title', 'scene.sceneNumber', 'scene.status'])
        .getMany();
      
      dependents.push(...scenes.map(scene => ({
        entityType: 'scene' as const,
        entityId: scene.id,
        entityName: scene.title || `Scene ${scene.sceneNumber}`,
        status: scene.status || 'draft'
      })));
      break;
    }
    // ... 其他case类似优化
  }

  return dependents;
}
```

### 3.3 添加性能监控

**新文件**: `backend/src/middleware/performanceMonitor.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export const performanceMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️  Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });

  next();
};
```

---

## 第四阶段：添加基本测试（预计4-5小时）

### 4.1 StatusService测试

**新文件**: `backend/src/services/__tests__/StatusService.test.ts`

```typescript
import { StatusService } from '../StatusService';
import { ErrorFactory } from '../../middleware/errorHandler';

describe('StatusService', () => {
  let service: StatusService;

  beforeEach(() => {
    service = new StatusService();
  });

  describe('updateShotStatus', () => {
    it('should update status when transition is valid', async () => {
      // Mock repository
      // Test valid transition
    });

    it('should throw error for invalid status', async () => {
      await expect(
        service.updateShotStatus('shot-id', 'invalid')
      ).rejects.toThrow();
    });

    it('should throw error for invalid transition', async () => {
      // Test locked -> generated (invalid)
    });
  });

  describe('batchUpdateShotStatus', () => {
    it('should update multiple shots', async () => {
      // Test batch update
    });
  });
});
```

### 4.2 DependencyService测试

**新文件**: `backend/src/services/__tests__/DependencyService.test.ts`

```typescript
import { DependencyService } from '../DependencyService';

describe('DependencyService', () => {
  let service: DependencyService;

  beforeEach(() => {
    service = new DependencyService();
  });

  describe('getDependentEntities', () => {
    it('should return scenes for story', async () => {
      // Test story -> scenes
    });

    it('should return shots for scene', async () => {
      // Test scene -> shots
    });

    it('should return empty array when no dependents', async () => {
      // Test no dependents
    });
  });

  describe('checkDownstreamImpact', () => {
    it('should return complete impact analysis', async () => {
      // Test full impact chain
    });
  });
});
```

### 4.3 错误处理中间件测试

**新文件**: `backend/src/middleware/__tests__/errorHandler.test.ts`

```typescript
import { errorHandler, AppError, ErrorFactory } from '../errorHandler';
import { Request, Response } from 'express';

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = { path: '/test', method: 'GET', ip: '127.0.0.1' };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should handle AppError correctly', () => {
    const error = ErrorFactory.notFound('Resource', 'id-123');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'RESOURCE_NOT_FOUND'
        })
      })
    );
  });

  it('should handle generic errors', () => {
    const error = new Error('Generic error');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
```

---

## 第五阶段：文档更新（预计1小时）

### 5.1 更新README

添加以下内容：
- 错误处理使用指南
- 状态管理使用指南
- 依赖追踪使用指南

### 5.2 创建API文档

**新文件**: `API_DOCUMENTATION.md`

包含：
- 所有API端点
- 请求/响应示例
- 错误代码说明

---

## 实施优先级

### 🔴 高优先级（必须完成）
1. 清理重复导入（第一阶段）
2. 完成Task 36集成（第二阶段）
3. 实现批量刷新逻辑（第二阶段）

### 🟡 中优先级（建议完成）
1. 统一错误处理使用（第一阶段）
2. 代码优化（第三阶段）
3. 添加性能监控（第三阶段）

### 🟢 低优先级（可选）
1. 添加单元测试（第四阶段）
2. 文档更新（第五阶段）

---

## 预计总时间

- **高优先级**: 3-5小时
- **中优先级**: 4-6小时
- **低优先级**: 5-6小时
- **总计**: 12-17小时

---

## 成功标准

### 功能完整性
- ✅ 所有三个任务的功能都能在UI中使用
- ✅ 修改Story/Scene/Shot时显示影响提示
- ✅ 批量刷新功能可用

### 代码质量
- ✅ 无重复导入
- ✅ 所有异步路由使用asyncHandler
- ✅ 代码格式统一

### 用户体验
- ✅ 错误提示友好
- ✅ 状态转换流畅
- ✅ 修改确认对话框清晰

---

## 下一步行动

1. **立即开始**: 清理重复导入（5分钟）
2. **今天完成**: Task 36集成（2-3小时）
3. **本周完成**: 代码优化（2-3小时）
4. **下周完成**: 测试和文档（可选）
