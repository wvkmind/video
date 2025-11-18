# 快速启动指南

## 🚀 5分钟快速开始

### 1. 安装依赖

```bash
# 克隆项目后，安装所有依赖
npm install
```

### 2. 配置环境

```bash
# 复制环境配置文件
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

编辑 `backend/.env`，确保以下配置正确：

```env
# 服务器端口
PORT=5000

# 数据库（开发环境使用 SQLite）
DB_TYPE=sqlite
DB_PATH=./dev.sqlite

# ComfyUI API 地址
COMFYUI_BASE_URL=http://localhost:8188

# 文件存储路径
STORAGE_BASE_PATH=./storage

# FFmpeg 路径（如果在 PATH 中可以直接使用 'ffmpeg'）
FFMPEG_PATH=ffmpeg
```

### 3. 启动服务

```bash
# 方式1: 同时启动前后端（推荐）
npm run dev

# 方式2: 分别启动
npm run dev:backend   # 后端: http://localhost:5000
npm run dev:frontend  # 前端: http://localhost:3000
```

### 4. 访问应用

打开浏览器访问: http://localhost:3000

## 📋 前置要求

### 必需
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

### 可选（用于完整功能）
- **ComfyUI**: 用于 AI 图像和视频生成
  - 下载: https://github.com/comfyanonymous/ComfyUI
  - 默认运行在: http://localhost:8188
  
- **FFmpeg**: 用于视频处理
  - 下载: https://ffmpeg.org/download.html
  - 确保 `ffmpeg` 命令在系统 PATH 中

## 🎯 基本使用流程

### 1. 创建项目
1. 点击"新建项目"
2. 填写项目名称、类型、目标时长等信息
3. 点击"创建"

### 2. 编辑故事
1. 进入项目后，点击"故事编辑"
2. 填写故事大纲（Hook/中段/结尾）
3. 创建场景并添加旁白文本

### 3. 设计分镜
1. 点击"分镜管理"
2. 为每个场景创建镜头
3. 填写镜头描述、环境、主体、动作等信息
4. 设置镜头顺序和衔接关系

### 4. 生成关键帧
1. 点击"关键帧生成"
2. 选择一个镜头
3. 选择 ComfyUI Workflow（如 SDXL 文生图）
4. 调整参数（steps, cfg, seed 等）
5. 点击"生成关键帧"
6. 从生成的多个版本中选择最佳的一个

### 5. 生成视频片段
1. 点击"视频生成"
2. 选择一个已有关键帧的镜头
3. 选择输入模式（图生视频/文生视频）
4. 选择 Demo 模式（快速预览）或正式模式
5. 点击"生成视频"
6. 等待生成完成，选择最佳版本

### 6. 编辑时间线
1. 点击"时间线编辑"
2. 查看已生成的视频片段
3. 调整片段顺序和时长
4. 添加音频轨道（可选）

### 7. 导出视频
1. 在时间线编辑页面
2. 点击"导出视频"
3. 选择格式和质量
4. 等待导出完成

## 🔧 常见问题

### Q: ComfyUI 连接失败
**A**: 确保 ComfyUI 正在运行，并且 `backend/.env` 中的 `COMFYUI_BASE_URL` 配置正确。

### Q: FFmpeg 命令未找到
**A**: 
1. 安装 FFmpeg: https://ffmpeg.org/download.html
2. 将 FFmpeg 添加到系统 PATH
3. 或在 `backend/.env` 中指定完整路径: `FFMPEG_PATH=/path/to/ffmpeg`

### Q: 数据库错误
**A**: 
1. 删除 `backend/dev.sqlite` 文件
2. 重启后端服务，数据库会自动重新创建

### Q: 端口被占用
**A**: 
1. 修改 `backend/.env` 中的 `PORT` 配置
2. 修改 `frontend/.env` 中的 `VITE_API_URL` 配置

### Q: 生成的文件在哪里？
**A**: 所有生成的图片和视频文件存储在 `storage/` 目录下。

## 📚 更多文档

- **完整功能说明**: 查看 FINAL_IMPLEMENTATION_SUMMARY.md
- **API 文档**: 查看 FINAL_IMPLEMENTATION_SUMMARY.md 中的 API 端点总览
- **开发指南**: 查看 README.md
- **任务完成报告**: 查看 TASK_COMPLETION_REPORT.md

## 🆘 获取帮助

如果遇到问题：
1. 查看控制台错误信息
2. 检查 `backend/.env` 配置
3. 确认 ComfyUI 和 FFmpeg 正常运行
4. 查看相关文档

## 🎉 开始创作

现在你已经准备好开始使用 AI 视频生成管理系统了！

祝你创作愉快！🎬
