# Workflow 配置管理实现文档

## 概述

本文档描述了 Workflow 配置管理功能的实现，该功能允许系统加载、管理和使用 ComfyUI workflow 配置。

## 实现的功能

### 1. Workflow 配置文件格式 (Task 12.1)

#### JSON Schema 定义
- 位置：`backend/src/schemas/workflowConfigSchema.ts`
- 定义了 `WorkflowConfigSchema` 和 `WorkflowParameterSchema` 接口
- 实现了 `validateWorkflowConfig()` 和 `validateWorkflowParameter()` 验证函数

#### 示例配置文件
创建了三个示例 workflow 配置：

1. **sdxl_text_to_image.json** - SDXL 基础文生图
   - 支持正向/负向提示词
   - 可调整图像尺寸、采样步数、CFG、采样器、种子

2. **img2img_reference.json** - 图生图（用于镜头衔接）
   - 支持参考图片输入
   - 可调整重绘幅度（denoise）
   - 用于实现镜头间的视觉连贯性

3. **svd_image_to_video.json** - SVD 图生视频
   - 支持关键帧图片输入
   - 可调整视频尺寸、帧数、帧率、运动强度

#### 配置文件文档
- 位置：`backend/workflows/README.md`
- 详细说明了配置文件格式、字段含义、占位符替换规则
- 提供了添加新 workflow 的指南

### 2. WorkflowConfigService (Task 12.2)

#### 服务位置
`backend/src/services/WorkflowConfigService.ts`

#### 主要方法

1. **loadConfigs()** - 从文件加载配置
   - 读取 `backend/workflows/` 目录下的所有 JSON 文件
   - 验证每个配置文件
   - 如果 workflow 已存在则更新，否则创建新记录
   - 返回加载结果统计（成功数、失败数、错误列表）

2. **getWorkflow(name)** - 根据名称获取 workflow
   - 返回激活状态的 workflow

3. **listWorkflows(type?)** - 列出所有 workflow
   - 可选按类型过滤（text_to_image, image_to_video, text_to_video）
   - 只返回激活状态的 workflow

4. **validateConfig(config)** - 验证配置
   - 使用 schema 验证配置的完整性和正确性
   - 返回验证结果和错误列表

5. **createWorkflow(config)** - 创建新 workflow
   - 验证配置
   - 检查名称唯一性
   - 保存到数据库

6. **updateWorkflow(id, config)** - 更新 workflow
   - 验证更新后的配置
   - 保存更改

7. **deleteWorkflow(id)** - 删除 workflow

8. **setWorkflowActive(id, isActive)** - 激活/停用 workflow

### 3. Workflow 配置 API 端点 (Task 12.3)

#### 路由位置
`backend/src/routes/workflowRoutes.ts`

#### API 端点

1. **GET /api/workflows**
   - 获取所有激活的 workflow 列表
   - 查询参数：`type` (可选) - 按类型过滤
   - 响应：workflow 数组和总数

2. **GET /api/workflows/:name**
   - 根据名称获取 workflow 详情
   - 返回完整的 workflow 配置（包括 workflowJSON 和 parameters）

3. **POST /api/workflows/reload**
   - 重新加载所有 workflow 配置文件
   - 用于在添加或修改配置文件后刷新数据库
   - 返回加载统计信息

4. **POST /api/workflows**
   - 创建新的 workflow 配置
   - 请求体：完整的 workflow 配置对象
   - 返回创建的 workflow

5. **PUT /api/workflows/:id**
   - 更新现有 workflow 配置
   - 请求体：部分或完整的 workflow 配置
   - 返回更新后的 workflow

6. **DELETE /api/workflows/:id**
   - 删除 workflow 配置

7. **PATCH /api/workflows/:id/active**
   - 激活或停用 workflow
   - 请求体：`{ "isActive": true/false }`

## 集成

### 应用启动时自动加载
在 `backend/src/index.ts` 中，数据库初始化后自动加载 workflow 配置：

```typescript
// Load workflow configurations on startup
const workflowService = new WorkflowConfigService();
const result = await workflowService.loadConfigs();
console.log(`Workflow 配置加载完成: ${result.loaded} 成功, ${result.failed} 失败`);
```

### 路由注册
在 `backend/src/routes/index.ts` 中注册 workflow 路由：

```typescript
router.use('/workflows', workflowRoutes);
```

## 验证

### 单元测试
位置：`backend/src/services/__tests__/WorkflowConfigService.test.ts`

测试覆盖：
- ✓ 验证正确的 workflow 配置
- ✓ 拒绝缺少必需字段的配置
- ✓ 拒绝无效的类型
- ✓ 验证参数结构
- ✓ 拒绝缺少必需字段的参数
- ✓ 拒绝没有 options 的 select 参数
- ✓ 验证带有 min/max/step 的数字参数
- ✓ 接受所有三种 workflow 类型

所有测试通过 ✓

## 使用示例

### 1. 获取所有文生图 workflow
```bash
GET /api/workflows?type=text_to_image
```

### 2. 获取特定 workflow
```bash
GET /api/workflows/sdxl_t2i_basic
```

### 3. 重新加载配置文件
```bash
POST /api/workflows/reload
```

### 4. 在代码中使用
```typescript
const workflowService = new WorkflowConfigService();

// 获取 workflow
const workflow = await workflowService.getWorkflow('sdxl_t2i_basic');

// 使用 workflow 的 JSON 和参数
const workflowJSON = workflow.workflowJSON;
const parameters = workflow.parameters;
```

## 配置文件占位符替换

Workflow JSON 中的占位符（如 `{{prompt}}`、`{{steps}}`）会在运行时被替换：

1. 系统根据 `parameters` 数组中的定义找到对应参数
2. 使用 `nodeId` 和 `fieldPath` 定位到 JSON 中的具体位置
3. 将占位符替换为实际值

例如：
```json
// 配置文件
{
  "5": {
    "inputs": {
      "steps": "{{steps}}"
    }
  }
}

// 参数定义
{
  "name": "steps",
  "defaultValue": 30,
  "nodeId": "5",
  "fieldPath": "inputs.steps"
}

// 替换后
{
  "5": {
    "inputs": {
      "steps": 30
    }
  }
}
```

## 扩展性

### 添加新的 Workflow
1. 在 ComfyUI 中设计并测试 workflow
2. 导出 workflow JSON
3. 创建配置文件（参考现有示例）
4. 将文件放在 `backend/workflows/` 目录
5. 调用 `/api/workflows/reload` 或重启应用

### 自定义参数
可以为任何 workflow 节点的任何字段添加可调参数：
- 在 `parameters` 数组中添加参数定义
- 在 `workflowJSON` 中使用 `{{parameter_name}}` 占位符
- 系统会自动处理替换

## 相关需求

- **Requirements 7.1**: 系统从配置文件加载 Workflow 列表
- **Requirements 7.6**: 用户更换生成模型只需修改配置

## 下一步

此功能为后续任务奠定了基础：
- Task 13: 实现关键帧生成服务（将使用 workflow 配置）
- Task 16: 实现视频片段生成服务（将使用 workflow 配置）
- ComfyUI 适配器将使用这些配置来组装和提交生成任务
