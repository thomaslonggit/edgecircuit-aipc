@echo off
echo.
echo =====================================================
echo Intel AIPC OpenVINO GenAI API Server
echo =====================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 未安装或未添加到 PATH
    echo 请安装 Python 3.8+ 并确保添加到系统 PATH
    pause
    exit /b 1
)

REM 激活OpenVINO环境 (如果存在)
if exist "openvino_env\Scripts\activate.bat" (
    echo 🔧 激活 OpenVINO 环境...
    call openvino_env\Scripts\activate.bat
)

REM 检查依赖是否安装
echo 📦 检查依赖包...
pip show fastapi >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 安装依赖包...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 🚀 启动 API 服务器...
echo 📖 API 文档: http://localhost:8000/docs
echo 🏥 健康检查: http://localhost:8000/health
echo 💡 按 Ctrl+C 停止服务器
echo.

REM 启动API服务器
python api_server.py

pause 