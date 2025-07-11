#!/bin/bash
set -e

echo "🚀 Verilog优化API服务 - Ubuntu 22.04 安装脚本"
echo "================================================"

# 检查是否为Ubuntu 22.04
if ! grep -q "Ubuntu 22.04" /etc/os-release; then
    echo "⚠️  警告：此脚本针对Ubuntu 22.04优化，其他版本可能有兼容性问题"
fi

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
   echo "❌ 请不要以root用户运行此脚本"
   exit 1
fi

echo "📦 更新系统包..."
sudo apt-get update && sudo apt-get upgrade -y

echo "📦 安装基础依赖..."
sudo apt-get install -y \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    cmake \
    ninja-build \
    yosys \
    verilator \
    libreadline-dev \
    libncurses5-dev \
    curl \
    wget \
    htop \
    tree

echo "🔧 安装ABC工具..."
if ! command -v abc &> /dev/null; then
    echo "从源码编译ABC..."
    cd /tmp
    git clone https://github.com/berkeley-abc/abc.git
    cd abc
    make -j$(nproc)
    sudo cp abc /usr/local/bin/
    cd ..
    rm -rf abc
    echo "✅ ABC安装完成"
else
    echo "✅ ABC已安装"
fi

echo "🐍 设置Python环境..."
# 创建虚拟环境
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ 虚拟环境创建完成"
fi

# 激活虚拟环境
source venv/bin/activate

# 升级pip
pip install --upgrade pip

# 安装Python依赖
echo "📦 安装Python依赖..."
pip install -r requirements.txt

echo "🔍 验证工具安装..."
echo "Python版本: $(python3 --version)"
echo "Yosys版本: $(yosys -V | head -1)"
echo "ABC版本: $(abc -q 'version' | head -1)"

echo "🧪 运行测试..."
python3 test_minimal.py

echo "🚀 启动API服务..."
echo "你可以使用以下命令启动服务："
echo ""
echo "开发模式（自动重载）："
echo "  source venv/bin/activate"
echo "  python3 verilog_optimizer_api.py --reload"
echo ""
echo "生产模式："
echo "  source venv/bin/activate"
echo "  python3 verilog_optimizer_api.py --host 0.0.0.0 --port 8000"
echo ""
echo "Docker模式："
echo "  docker-compose up -d"
echo ""
echo "📚 API文档将在以下地址提供："
echo "  http://localhost:8000/docs (Swagger UI)"
echo "  http://localhost:8000/redoc (ReDoc)"
echo ""

# 创建启动脚本
cat > start_api.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
python3 verilog_optimizer_api.py --host 0.0.0.0 --port 8000
EOF

chmod +x start_api.sh

echo "✅ 安装完成！"
echo "💡 使用 ./start_api.sh 快速启动服务" 