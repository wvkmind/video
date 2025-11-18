#!/bin/bash

echo "==================================="
echo "AI视频生成管理系统 - 项目初始化"
echo "==================================="

# Check Node.js version
echo "检查 Node.js 版本..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "错误: 需要 Node.js 18 或更高版本"
    exit 1
fi
echo "✓ Node.js 版本符合要求"

# Install dependencies
echo ""
echo "安装依赖..."
npm install

# Setup environment files
echo ""
echo "设置环境变量文件..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✓ 创建 backend/.env"
else
    echo "backend/.env 已存在，跳过"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✓ 创建 frontend/.env"
else
    echo "frontend/.env 已存在，跳过"
fi

# Create storage directory
echo ""
echo "创建存储目录..."
mkdir -p storage/keyframes
mkdir -p storage/clips
mkdir -p storage/exports
echo "✓ 存储目录创建完成"

echo ""
echo "==================================="
echo "初始化完成！"
echo "==================================="
echo ""
echo "下一步："
echo "1. 确保 ComfyUI 正在运行 (http://localhost:8188)"
echo "2. 根据需要修改 backend/.env 和 frontend/.env"
echo "3. 运行 'npm run dev' 启动开发服务器"
echo ""
