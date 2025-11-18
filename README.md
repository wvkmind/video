# AI视频生成管理系统

基于 ComfyUI 的 AI 视频生成管理平台，为个人和小团队提供从故事构思到成片导出的完整工作流。

## 技术栈

### 前端
- React 18
- TypeScript
- Vite
- React Router

### 后端
- Node.js
- Express
- TypeScript
- TypeORM

### 数据库
- SQLite (开发环境)
- PostgreSQL (生产环境)

### 外部服务
- ComfyUI (图像和视频生成)
- FFmpeg (视频处理)
- Poe API (可选，LLM辅助生成)

## 项目结构

```
ai-video-production-system/
├── frontend/              # React前端应用
│   ├── src/
│   │   ├── main.tsx      # 入口文件
│   │   ├── App.tsx       # 主应用组件
│   │   └── index.css     # 全局样式
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/               # Express后端应用
│   ├── src/
│   │   ├── index.ts      # 服务器入口
│   │   ├── config/       # 配置文件
│   │   ├── entities/     # 数据模型
│   │   ├── services/     # 业务逻辑
│   │   ├── repositories/ # 数据访问层
│   │   ├── routes/       # API路由
│   │   ├── middleware/   # 中间件
│   │   ├── migrations/   # 数据库迁移
│   │   └── utils/        # 工具函数
│   ├── package.json
│   └── tsconfig.json
├── storage/               # 生成文件存储
├── package.json          # 根package.json (workspaces)
└── README.md
```

## 快速开始

### 前置要求

- Node.js >= 18
- npm >= 9
- ComfyUI (运行在 http://localhost:8188)
- FFmpeg

### 安装依赖

```bash
# 安装所有依赖（前端 + 后端）
npm install
```

### 环境配置

1. 复制环境变量示例文件：

```bash
# 后端
cp backend/.env.example backend/.env

# 前端
cp frontend/.env.example frontend/.env
```

2. 根据需要修改 `.env` 文件中的配置

### 开发模式

```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
npm run dev:frontend  # 前端运行在 http://localhost:3000
npm run dev:backend   # 后端运行在 http://localhost:5000
```

### 构建生产版本

```bash
npm run build
```

### 代码检查和格式化

```bash
# 运行 ESLint
npm run lint

# 格式化代码
npm run format
```

## 开发指南

### 数据库

开发环境默认使用 SQLite，数据库文件位于 `backend/dev.sqlite`。

生产环境建议使用 PostgreSQL，在 `backend/.env` 中配置：

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=ai_video_production
```

### ComfyUI 集成

确保 ComfyUI 正在运行，并在 `backend/.env` 中配置正确的地址：

```env
COMFYUI_BASE_URL=http://localhost:8188
```

### 文件存储

生成的图片和视频文件存储在 `storage/` 目录下。

## 功能模块

1. **项目管理** - 创建、复制、归档项目
2. **故事编辑** - 编辑故事大纲和场景脚本
3. **分镜管理** - 管理镜头列表和衔接关系
4. **关键帧生成** - 使用 ComfyUI 生成关键帧图片
5. **视频片段生成** - 生成视频片段
6. **时间线编辑** - 编辑时间线并导出成片

## 许可证

MIT
