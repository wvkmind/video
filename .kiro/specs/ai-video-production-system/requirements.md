# Requirements Document

## Introduction

本系统是一个基于 ComfyUI 的 AI 视频生成管理平台，为个人和小团队提供从故事构思到成片导出的完整工作流。系统将视频制作流程分解为 6 个层次（项目、故事脚本、分镜、关键帧、视频片段、时间线），每个层次都支持独立编辑和版本管理，确保创作过程的灵活性和可追溯性。

## Glossary

- **System**: AI 视频生成管理系统
- **ComfyUI**: 后端图像和视频生成引擎，通过 HTTP API 调用
- **Project**: 项目，代表一个完整的视频制作任务
- **Scene**: 场景，故事中的一个段落，包含多个镜头
- **Shot**: 镜头，视频的最小单位，对应一个连续的画面片段
- **Keyframe**: 关键帧，镜头的静态图像参考
- **Clip**: 视频片段，由 ComfyUI 生成的镜头视频文件
- **Workflow**: ComfyUI 中预配置的生成流程（如图生图、图生视频）
- **Timeline**: 时间线，所有视频片段的排列和编辑序列
- **Prompt**: 提示词，用于指导 AI 生成内容的文本描述
- **Demo Mode**: 演示模式，使用低分辨率和低步数快速预览
- **Production Mode**: 正式模式，使用目标分辨率和完整步数生成最终内容

## Requirements

### Requirement 1

**User Story:** 作为用户，我想要管理多个视频项目，以便我可以组织和追踪不同的视频制作任务。

#### Acceptance Criteria

1. WHEN 用户访问项目总览页 THEN the System SHALL 显示所有项目的列表，包含项目名称、类型、目标时长、当前进度、创建时间和最近修改时间
2. WHEN 用户点击新建项目按钮 THEN the System SHALL 显示新建项目表单，包含项目名称、目标时长、目标风格、主要受众和备注字段
3. WHEN 用户提交新建项目表单 THEN the System SHALL 创建新项目并将其添加到项目列表中
4. WHEN 用户选择复制项目 THEN the System SHALL 创建该项目的完整副本，包含所有层级的数据和配置
5. WHEN 用户选择归档或删除项目 THEN the System SHALL 更新项目状态或从列表中移除该项目

### Requirement 2

**User Story:** 作为用户，我想要编辑故事和脚本，以便我可以在文字层面规划视频内容。

#### Acceptance Criteria

1. WHEN 用户进入故事编辑页 THEN the System SHALL 显示故事大纲编辑区和场景列表
2. WHEN 用户编辑故事大纲 THEN the System SHALL 保存 Hook、中段结构和结尾内容
3. WHEN 用户创建新场景 THEN the System SHALL 添加场景到列表，包含场景简介、预估时长、旁白文本和备注字段
4. WHEN 用户修改场景的旁白文本 THEN the System SHALL 保存更新并支持多版本管理
5. WHEN 用户请求 LLM 辅助生成 THEN the System SHALL 根据项目简介生成故事大纲或根据大纲生成场景旁白草稿

### Requirement 3

**User Story:** 作为用户，我想要管理分镜，以便我可以将故事拆解为具体的镜头并规划画面细节。

#### Acceptance Criteria

1. WHEN 用户进入分镜管理页 THEN the System SHALL 显示场景时间轴和镜头列表
2. WHEN 用户创建新镜头 THEN the System SHALL 添加镜头到列表，包含 Shot ID、所属场景、时长、画面类型、镜头描述、环境、主体、动作、镜头运动、光线氛围和风格字段
3. WHEN 用户拖拽镜头 THEN the System SHALL 更新镜头顺序并保持场景关联
4. WHEN 用户设置镜头衔接关系 THEN the System SHALL 记录前后镜头 ID、衔接类型和是否使用上一镜头结尾帧作为开头帧
5. WHEN 用户批量设置风格 THEN the System SHALL 将选定的风格参数应用到所有选中的镜头
6. WHEN 用户导出分镜表 THEN the System SHALL 生成包含所有镜头结构化描述的 CSV 文件

### Requirement 4

**User Story:** 作为用户，我想要生成和管理关键帧图片，以便我可以确定每个镜头的构图、人设和视觉风格。

#### Acceptance Criteria

1. WHEN 用户进入关键帧生成页 THEN the System SHALL 显示镜头列表、当前镜头的关键帧预览和 Prompt 编辑区
2. WHEN 用户选择一个镜头 THEN the System SHALL 根据分镜字段自动生成英文 Prompt
3. WHEN 用户选择 ComfyUI Workflow THEN the System SHALL 显示该 Workflow 的可调参数表单，包含 steps、cfg、sampler、分辨率和 seed
4. WHEN 用户点击生成关键帧 THEN the System SHALL 调用 ComfyUI API 生成 4 张候选图片并显示缩略图
5. WHEN 用户选定一张关键帧 THEN the System SHALL 将其标记为该镜头的当前关键帧
6. WHEN 用户生成新版本关键帧 THEN the System SHALL 保存为新版本并保留历史版本的参数和 seed
7. WHEN 用户批量应用角色或风格设定 THEN the System SHALL 更新所有选中镜头的 Prompt 并保持统一性
8. WHEN ComfyUI 生成完成 THEN the System SHALL 保存图片路径、最终 Prompt 和生成参数

### Requirement 5

**User Story:** 作为用户，我想要生成和管理视频片段，以便我可以将关键帧或文本转换为动态视频。

#### Acceptance Criteria

1. WHEN 用户进入视频片段生成页 THEN the System SHALL 显示镜头列表、当前镜头的视频预览和参数设置区
2. WHEN 用户选择输入模式 THEN the System SHALL 支持图生视频（使用关键帧）或文生视频（仅使用 Prompt）
3. WHEN 用户设置视频参数 THEN the System SHALL 记录时长、帧率、分辨率、Workflow 名称、步数、guidance、cfg 和 seed
4. WHEN 用户启用首帧参考上一镜头末帧 THEN the System SHALL 将上一镜头 Clip 的最后一帧作为当前生成的参考图输入
5. WHEN 用户选择 Demo 模式 THEN the System SHALL 使用低分辨率、低步数和短时长快速生成预览视频
6. WHEN 用户选择正式生成 THEN the System SHALL 使用目标分辨率和完整步数生成最终 Clip
7. WHEN 用户生成新版本 Clip THEN the System SHALL 保存为新版本并允许用户对比和选择使用版本
8. WHEN ComfyUI 视频生成完成 THEN the System SHALL 保存 Clip 文件路径、时长、fps、分辨率和衔接元数据

### Requirement 6

**User Story:** 作为用户，我想要编辑时间线并导出成片，以便我可以完成视频的最终组装和输出。

#### Acceptance Criteria

1. WHEN 用户进入时间线编辑页 THEN the System SHALL 显示全局时间线、视频主轨、音频轨和侧边旁白信息
2. WHEN 用户导入旁白音频 THEN the System SHALL 在时间线下方显示音频波形
3. WHEN 用户拖拽调整 Clip 顺序 THEN the System SHALL 更新时间线排列并提示与分镜页的冲突
4. WHEN 用户微调 Clip 的 IN/OUT 点 THEN the System SHALL 更新该 Clip 的实际使用时长
5. WHEN 用户添加转场标记 THEN the System SHALL 在镜头间记录转场类型元数据
6. WHEN 用户导出合成视频 THEN the System SHALL 调用 ffmpeg 按时间线合成一条完整的 mp4 文件
7. WHEN 用户导出剪辑工程文件 THEN the System SHALL 生成 EDL、XML 或 JSON 格式文件，包含 Clip 路径、时长、顺序和转场元数据
8. WHEN 用户保存时间线版本 THEN the System SHALL 创建版本快照并支持回滚或复制版本

### Requirement 7

**User Story:** 作为用户，我想要系统与 ComfyUI 深度集成，以便我可以灵活调用不同的生成模型和工作流。

#### Acceptance Criteria

1. WHEN 系统初始化 THEN the System SHALL 从配置文件加载已注册的 ComfyUI Workflow 列表，包含 Workflow ID 和可调参数映射
2. WHEN 用户请求生成关键帧或视频 THEN the System SHALL 组装 ComfyUI JSON 请求，包含 Workflow 名称、Prompt、参数和输出路径
3. WHEN System 提交生成任务到 ComfyUI THEN the System SHALL 通过 /prompt API 发送请求并获取任务 ID
4. WHEN ComfyUI 处理任务 THEN the System SHALL 通过轮询 /history API 或 WebSocket 获取任务状态和进度
5. WHEN ComfyUI 任务完成 THEN the System SHALL 获取生成文件路径并更新数据库记录
6. WHEN 用户更换生成模型 THEN the System SHALL 仅需修改 Workflow 配置而无需改动前端代码

### Requirement 8

**User Story:** 作为用户，我想要所有层级都支持版本管理和状态追踪，以便我可以安全地修改和回滚内容。

#### Acceptance Criteria

1. WHEN 用户修改任何层级的内容 THEN the System SHALL 保存修改历史并生成新版本号
2. WHEN 用户查看历史版本 THEN the System SHALL 显示版本列表，包含版本号、修改时间和修改内容摘要
3. WHEN 用户回滚到历史版本 THEN the System SHALL 恢复该版本的所有数据
4. WHEN 用户修改上层内容 THEN the System SHALL 提示是否批量刷新下层产物
5. WHEN 实体处于不同状态 THEN the System SHALL 标记状态为草稿、已生成或已锁定

### Requirement 9

**User Story:** 作为用户，我想要系统强调镜头衔接的连贯性，以便我可以确保视频画面流畅过渡。

#### Acceptance Criteria

1. WHEN 用户在分镜页标记镜头衔接关系 THEN the System SHALL 记录上一镜头尾帧等于下一镜头首帧的约束
2. WHEN 生成关键帧 THEN the System SHALL 自动使用上一镜头的关键帧作为参考条件
3. WHEN 生成视频片段 THEN the System SHALL 自动使用上一镜头 Clip 的尾帧作为当前生成的首帧条件
4. WHEN 用户在时间线查看衔接点 THEN the System SHALL 高亮显示镜头间的衔接关系并提供预览对比
5. WHEN 衔接帧不匹配 THEN the System SHALL 提示用户检查并提供重新生成选项

### Requirement 10

**User Story:** 作为用户，我想要管理角色和风格设定，以便我可以在多个镜头间保持视觉一致性。

#### Acceptance Criteria

1. WHEN 用户创建角色设定 THEN the System SHALL 保存角色的文字描述、参考图和 LoRA 名称
2. WHEN 用户在镜头中应用角色设定 THEN the System SHALL 自动将角色信息添加到 Prompt 中
3. WHEN 用户创建风格预设 THEN the System SHALL 保存风格的 Prompt 前缀和参数配置
4. WHEN 用户批量应用风格预设 THEN the System SHALL 更新所有选中镜头的风格参数
5. WHEN 生成内容时 THEN the System SHALL 确保使用相同角色和风格设定的镜头保持视觉一致性
