# ComfyUI Workflow 配置文件

本目录包含 ComfyUI workflow 的配置文件，用于定义不同的图像和视频生成流程。

## 配置文件格式

每个配置文件都是一个 JSON 文件，包含以下字段：

### 顶层字段

- `name` (string, required): Workflow 的唯一标识符，用于 API 调用
- `displayName` (string, required): 用户界面显示的名称
- `type` (string, required): Workflow 类型，可选值：
  - `text_to_image`: 文生图
  - `image_to_video`: 图生视频
  - `text_to_video`: 文生视频
- `isActive` (boolean, optional): 是否激活，默认为 true
- `workflowJSON` (object, required): ComfyUI 的完整 workflow JSON 定义
- `parameters` (array, required): 可调参数列表

### workflowJSON 字段

这是 ComfyUI 的标准 workflow JSON 格式。节点 ID 作为键，节点配置作为值。

在节点的 inputs 中，可以使用 `{{parameter_name}}` 占位符来引用可调参数。

示例：
```json
{
  "5": {
    "class_type": "KSampler",
    "inputs": {
      "seed": "{{seed}}",
      "steps": "{{steps}}",
      "cfg": "{{cfg}}"
    }
  }
}
```

### parameters 字段

每个参数对象包含以下字段：

- `name` (string, required): 参数名称，用于 API 调用和占位符替换
- `displayName` (string, required): 用户界面显示的名称
- `type` (string, required): 参数类型，可选值：
  - `number`: 数字
  - `string`: 字符串
  - `select`: 下拉选择
- `defaultValue` (any, required): 默认值
- `nodeId` (string, required): 参数所属的节点 ID
- `fieldPath` (string, required): 参数在节点中的字段路径，如 `inputs.steps`
- `min` (number, optional): 最小值（仅用于 number 类型）
- `max` (number, optional): 最大值（仅用于 number 类型）
- `step` (number, optional): 步长（仅用于 number 类型）
- `options` (array, optional): 可选值列表（仅用于 select 类型）

## 示例配置文件

### 1. sdxl_text_to_image.json

SDXL 基础文生图 workflow，支持以下参数：
- 正向/负向提示词
- 图像尺寸（宽度、高度）
- 采样步数
- CFG Scale
- 采样器选择
- 随机种子

### 2. img2img_reference.json

图生图 workflow，用于镜头衔接场景，支持：
- 参考图片输入
- 重绘幅度控制
- 其他标准参数

### 3. svd_image_to_video.json

Stable Video Diffusion 图生视频 workflow，支持：
- 关键帧图片输入
- 视频尺寸和帧数
- 帧率控制
- 运动强度
- 其他生成参数

## 添加新的 Workflow

1. 在 ComfyUI 中设计并测试你的 workflow
2. 导出 workflow JSON
3. 创建新的配置文件，包含：
   - 基本信息（name, displayName, type）
   - 完整的 workflowJSON
   - 可调参数定义
4. 使用占位符替换 workflowJSON 中需要动态设置的值
5. 将配置文件放在本目录
6. 系统启动时会自动加载所有配置文件

## 参数占位符替换规则

系统会在运行时将 `{{parameter_name}}` 替换为实际值：

1. 查找 parameters 数组中 name 匹配的参数
2. 使用 nodeId 和 fieldPath 定位到 workflowJSON 中的具体位置
3. 将占位符替换为参数值

例如：
```json
// 配置文件中
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

// 运行时替换后
{
  "5": {
    "inputs": {
      "steps": 30
    }
  }
}
```

## 验证

配置文件会在加载时进行验证，确保：
- 所有必需字段都存在
- 字段类型正确
- 参数定义完整
- nodeId 和 fieldPath 有效

验证失败的配置文件会被跳过，并记录错误日志。
