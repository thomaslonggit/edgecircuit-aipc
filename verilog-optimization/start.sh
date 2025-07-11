#!/bin/bash

echo "🚀 启动Verilog优化API服务"
echo "======================="

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "❌ 找不到虚拟环境，请先运行: ./simple_install.sh"
    exit 1
fi

# 激活虚拟环境
source venv/bin/activate

# 检查依赖
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "❌ 缺少依赖，请先运行: ./simple_install.sh"
    exit 1
fi

echo "✅ 环境检查通过"
echo "🌐 服务将在 http://localhost:8000 启动"
echo "📚 API文档: http://localhost:8000/docs"
echo "❓ 健康检查: http://localhost:8000/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动API服务
python3 verilog_optimizer_api.py --host 0.0.0.0 --port 8000 