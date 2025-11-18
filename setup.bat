@echo off
echo ===================================
echo AI视频生成管理系统 - 项目初始化
echo ===================================

echo 检查 Node.js 版本...
node -v >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 Node.js
    exit /b 1
)
echo ✓ Node.js 已安装

echo.
echo 安装依赖...
call npm install

echo.
echo 设置环境变量文件...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo ✓ 创建 backend\.env
) else (
    echo backend\.env 已存在，跳过
)

if not exist frontend\.env (
    copy frontend\.env.example frontend\.env
    echo ✓ 创建 frontend\.env
) else (
    echo frontend\.env 已存在，跳过
)

echo.
echo 创建存储目录...
if not exist storage mkdir storage
if not exist storage\keyframes mkdir storage\keyframes
if not exist storage\clips mkdir storage\clips
if not exist storage\exports mkdir storage\exports
echo ✓ 存储目录创建完成

echo.
echo ===================================
echo 初始化完成！
echo ===================================
echo.
echo 下一步：
echo 1. 确保 ComfyUI 正在运行 (http://localhost:8188)
echo 2. 根据需要修改 backend\.env 和 frontend\.env
echo 3. 运行 'npm run dev' 启动开发服务器
echo.
pause
