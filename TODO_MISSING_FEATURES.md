# 待实现功能清单

## 概述
本文档记录了经过代码审查后发现的需要完成的功能。

---

## 1. Task 36 - 修改确认对话框集成 ⚠️ 高优先级

### 状态
- 后端服务：✅ 完成
- 前端组件：✅ 完成
- UI集成：❌ 未完成

### 需要做的事
在以下组件中集成 `ModificationConfirmDialog`：

#### 1.1 StoryEditorView.tsx
```typescript
// 添加 imports
import { ModificationConfirmDialog } from './ModificationConfirmDialog';
import { useModificationConfirm } from '../hooks/useModificationConfirm';

// 在组件中添加
const { dialogProps, showConfirmDialog } = useModificationConfirm({
  entityType: 'story',
  entityId: projectId || '',
  entityName: story?.outline || 'Story',
  onConfirm: async (refreshDownstream) => {
    await handleSaveStory();
    if (refreshDownstream) {
      // TODO: 实现批量刷新场景和镜头
    }
  }
});

// 修改保存按钮
<button onClick={showConfirmDialog}>保存</button>

// 添加对话框
<ModificationConfirmDialog {...dialogProps} />
```

#### 1.2 StoryboardView.tsx
为场景和镜头编辑添加确认对话框

### 预计时间
1-2小时

---

## 2. Task 21 - 时间线编辑器完整实现 ⚠️ 高优先级

### 当前状态（简化版）
- ✅ 基本列表展示
- ✅ 版本管理UI
- ✅ 导出功能
- ✅ 镜头衔接点预览
- ✅ 帧匹配检测

### 缺失功能（根据 Requirement 6）

#### 2.1 可视化时间线轨道 (Req 6.1)
**需要实现**：
- 时间刻度尺
- 可视化视频轨道
- 可视化音频轨道
- Clip显示为时间块
- 播放头指示器

**新建文件**：
- `frontend/src/components/timeline/TimelineTrack.tsx`
- `frontend/src/components/timeline/TimelineRuler.tsx`
- `frontend/src/components/timeline/TimelinePlayhead.tsx`

**预计时间**：4-6小时

#### 2.2 音频波形显示 (Req 6.2)
**需要实现**：
- 导入旁白音频
- 显示音频波形
- 波形与视频同步

**技术栈**：
- wavesurfer.js

**新建文件**：
- `frontend/src/components/timeline/AudioWaveform.tsx`
- `frontend/src/components/timeline/AudioImporter.tsx`

**后端API**：
- `POST /api/upload/audio` - 上传音频文件

**预计时间**：3-4小时

#### 2.3 拖拽调整Clip顺序 (Req 6.3)
**需要实现**：
- 拖拽重排Clip
- 检测与分镜页的顺序冲突
- 显示冲突警告
- 提供修复建议

**技术栈**：
- react-dnd

**新建文件**：
- `frontend/src/components/timeline/DraggableClip.tsx`
- `frontend/src/components/timeline/ConflictWarning.tsx`
- `frontend/src/utils/timelineConflictDetector.ts`

**预计时间**：3-4小时

#### 2.4 微调Clip的IN/OUT点 (Req 6.4)
**需要实现**：
- 精确调整Clip起始点
- 精确调整Clip结束点
- 实时更新时长
- 帧级别精度

**新建文件**：
- `frontend/src/components/timeline/ClipTrimmer.tsx`
- `frontend/src/components/timeline/ClipDetailPanel.tsx`

**后端API**：
- `PUT /api/projects/:id/timeline/clips/:clipId/trim`

**预计时间**：2-3小时

#### 2.5 转场标记和编辑 (Req 6.5)
**需要实现**：
- 在镜头间添加转场标记
- 编辑转场类型（cut/dissolve/motion）
- 编辑转场时长
- 可视化显示转场

**新建文件**：
- `frontend/src/components/timeline/TransitionMarker.tsx`
- `frontend/src/components/timeline/TransitionEditor.tsx`

**后端API**：
- `POST /api/projects/:id/timeline/transitions`
- `PUT /api/projects/:id/timeline/transitions/:id`
- `DELETE /api/projects/:id/timeline/transitions/:id`

**预计时间**：2-3小时

#### 2.6 播放控制（增强功能）
**需要实现**：
- 视频播放器
- 播放/暂停控制
- 播放速度调整
- 帧进/帧退

**新建文件**：
- `frontend/src/components/timeline/VideoPlayer.tsx`
- `frontend/src/components/timeline/PlaybackControls.tsx`

**预计时间**：2-3小时

#### 2.7 缩放和滚动（增强功能）
**需要实现**：
- 时间线缩放
- 虚拟滚动优化
- 适应窗口

**新建文件**：
- `frontend/src/components/timeline/TimelineZoom.tsx`

**预计时间**：1-2小时

### Task 21 总预计时间
**核心功能（2.1-2.5）**：14-20小时
**增强功能（2.6-2.7）**：3-5小时
**总计**：17-25小时

---

## 3. 其他待完善项

### 3.1 单元测试
所有标记为 `*` 的测试任务未完成（但在任务中标记为可选）

**建议优先级**：低
**预计时间**：10-15小时

### 3.2 API文档
完整的API文档缺失

**建议优先级**：中
**预计时间**：2-3小时

### 3.3 用户文档
用户使用指南缺失

**建议优先级**：中
**预计时间**：3-4小时

---

## 实施优先级

### 🔴 P0 - 必须完成
1. **Task 36集成**（1-2小时）
2. **Task 21核心功能**（14-20小时）

### 🟡 P1 - 强烈建议
1. **Task 21增强功能**（3-5小时）
2. **API文档**（2-3小时）

### 🟢 P2 - 可选
1. **单元测试**（10-15小时）
2. **用户文档**（3-4小时）

---

## 总时间估算

- **最小可用版本**：15-22小时（P0）
- **推荐完整版本**：18-27小时（P0 + P1）
- **完美版本**：31-46小时（全部）

---

## 明天的工作计划

### 上午（4小时）
1. ✅ Task 36集成（1-2小时）
2. ✅ Task 21.1 - 可视化时间线轨道开始（2小时）

### 下午（4小时）
1. ✅ Task 21.1 - 可视化时间线轨道完成（2小时）
2. ✅ Task 21.3 - 拖拽功能开始（2小时）

### 预期成果
- Task 36完全可用
- 时间线有基本的可视化展示
- 拖拽功能部分完成

---

## 技术栈需求

### 新增依赖
```bash
npm install react-dnd react-dnd-html5-backend wavesurfer.js
```

### 后端依赖
- multer（文件上传）- 可能已安装
- ffmpeg（音频处理）- 需要系统安装

---

## 文件清单

### 需要修改的文件
1. `frontend/src/components/StoryEditorView.tsx`
2. `frontend/src/components/StoryboardView.tsx`
3. `frontend/src/components/TimelineEditorView.tsx`（大幅重构）
4. `backend/src/routes/timelineRoutes.ts`（添加新端点）
5. `backend/src/services/TimelineService.ts`（添加新方法）

### 需要新建的文件
**Timeline组件**（约10个文件）：
- TimelineTrack.tsx
- TimelineRuler.tsx
- TimelinePlayhead.tsx
- DraggableClip.tsx
- ClipTrimmer.tsx
- ClipDetailPanel.tsx
- AudioWaveform.tsx
- AudioImporter.tsx
- TransitionMarker.tsx
- TransitionEditor.tsx
- ConflictWarning.tsx
- VideoPlayer.tsx
- PlaybackControls.tsx
- TimelineZoom.tsx

**工具函数**（约2个文件）：
- timelineConflictDetector.ts
- timelineUtils.ts

**样式文件**（约5个文件）：
- Timeline.css
- TimelineTrack.css
- TimelineControls.css
- 等

---

## 成功标准

### Task 36
- ✅ 修改Story时显示影响提示
- ✅ 修改Scene时显示影响提示
- ✅ 修改Shot时显示影响提示
- ✅ 可选择是否批量刷新

### Task 21
- ✅ 可视化时间线轨道
- ✅ 拖拽调整Clip顺序
- ✅ 精确调整IN/OUT点
- ✅ 音频波形显示
- ✅ 转场标记和编辑
- ✅ 冲突检测和警告
- ✅ 满足Requirement 6的所有验收标准

---

## 备注

- 所有核心功能的后端API已基本完成
- 主要工作集中在前端UI实现
- 建议采用组件化、模块化的方式实现
- 每个功能完成后立即测试
- 保持代码质量和TypeScript类型安全

---

**创建时间**：2024年
**最后更新**：2024年
**状态**：待实施
