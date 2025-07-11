@echo off
chcp 65001 >nul
title Intel AIPC 模型性能基准测试

echo.
echo ==========================================
echo   Intel AIPC 模型性能基准测试工具
echo ==========================================
echo.

echo 可用选项:
echo   0. 环境检查 (推荐首次运行)
echo   1. 完整测试 (CPU + GPU + NPU)
echo   2. 仅测试 NPU
echo   3. 仅测试 GPU  
echo   4. 仅测试 CPU
echo   5. 自定义测试
echo   6. 快速测试 (较少轮次)
echo.

set /p choice="请选择测试类型 (0-6): "

if "%choice%"=="0" (
    echo 🔍 开始环境检查...
    python check_environment.py
    echo.
    echo 💡 环境检查完成，如果没有问题可以继续选择其他测试选项
    pause
    goto :eof
)

if "%choice%"=="1" (
    echo 🚀 开始完整测试...
    python benchmark.py
    goto :end
)

if "%choice%"=="2" (
    echo 🚀 开始 NPU 测试...
    python benchmark.py --devices NPU
    goto :end
)

if "%choice%"=="3" (
    echo 🚀 开始 GPU 测试...
    python benchmark.py --devices GPU
    goto :end
)

if "%choice%"=="4" (
    echo 🚀 开始 CPU 测试...
    python benchmark.py --devices CPU
    goto :end
)

if "%choice%"=="5" (
    echo.
    echo 可选设备: CPU, GPU, NPU
    set /p devices="请输入要测试的设备 (用空格分隔): "
    set /p tokens="请输入最大token数 (默认512): "
    set /p rounds="请输入测试轮次 (默认5): "
    
    if "%tokens%"=="" set tokens=512
    if "%rounds%"=="" set rounds=5
    
    echo 🚀 开始自定义测试...
    python benchmark.py --devices %devices% --tokens %tokens% --rounds %rounds%
    goto :end
)

if "%choice%"=="6" (
    echo 🚀 开始快速测试...
    python benchmark.py --rounds 2 --tokens 256
    goto :end
)

echo ❌ 无效选择，请重新运行脚本
pause
exit /b 1

:end
echo.
echo ✅ 测试完成！
echo 📄 详细报告已保存为 JSON 文件
echo.
pause 