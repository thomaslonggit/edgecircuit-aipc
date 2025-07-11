#!/bin/bash
set -e

echo "🚀 Verilog优化API - 简化Ubuntu安装"
echo "================================="

# 检查Ubuntu版本
if ! grep -q "Ubuntu" /etc/os-release; then
    echo "⚠️  建议在Ubuntu系统上运行"
fi

echo "📦 安装系统依赖..."
sudo apt update
sudo apt install -y python3 python3-pip python3-venv yosys build-essential git curl

echo "🔧 安装ABC工具..."
if ! command -v abc &> /dev/null; then
    echo "编译安装ABC..."
    cd /tmp
    git clone https://github.com/berkeley-abc/abc.git
    cd abc
    make -j$(nproc)
    sudo cp abc /usr/local/bin/
    cd - > /dev/null
    rm -rf /tmp/abc
    echo "✅ ABC安装完成"
else
    echo "✅ ABC已存在"
fi

echo "🐍 设置Python环境..."
# 如果没有虚拟环境则创建
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# 激活并安装依赖
source venv/bin/activate
pip install --upgrade pip
pip install -r simple_requirements.txt

echo "🧪 测试工具..."
echo "Python: $(python3 --version)"
echo "Yosys: $(yosys -V | head -1)"
echo "ABC: $(abc -q 'version' | head -1)"

echo "✅ 安装完成！"
echo ""
echo "🚀 启动命令："
echo "  source venv/bin/activate"
echo "  python3 verilog_optimizer_api.py"
echo ""
echo "📚 API文档: http://localhost:8000/docs" 