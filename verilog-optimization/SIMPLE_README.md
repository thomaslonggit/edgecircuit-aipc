# 🚀 Verilog优化API - 简化版

基于贝叶斯优化的Verilog RTL逻辑优化REST API服务，专为Ubuntu系统设计，**无需Docker**。

## ✨ 特性

- 🎯 **智能优化**：使用贝叶斯优化搜索最佳优化序列  
- 📖 **默认可读**：生成清晰可读的Verilog代码
- ⚡ **轻量级部署**：直接在Ubuntu上运行，无需容器
- 🔧 **多种策略**：支持5种不同的优化策略
- 📚 **自动文档**：内置Swagger UI文档
- 🛠️ **一键安装**：自动化安装脚本

## 🚀 三步快速开始

### 1️⃣ 安装
```bash
chmod +x simple_install.sh
./simple_install.sh
```

### 2️⃣ 启动
```bash
chmod +x start.sh
./start.sh
```

### 3️⃣ 测试
```bash
python3 quick_test.py
```

就这么简单！🎉

## 📋 系统要求

- **操作系统**: Ubuntu 18.04+ (推荐22.04)
- **内存**: 2GB+ 
- **CPU**: 2核+
- **网络**: 可访问互联网（用于下载依赖）

## 🎛️ 优化策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `readable` ⭐ | **默认策略**，可读优化 | 日常开发，代码维护 |
| `minimal` | 最小优化，保持结构 | 快速清理 |
| `balanced` | 平衡优化 | 面积和可读性兼顾 |
| `yosys_only` | 纯Yosys优化 | 工具兼容性问题 |
| `aggressive` | 激进优化 | 极限面积优化 |

## 📖 API使用

### 基本用法（curl）
```bash
curl -X POST "http://localhost:8000/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "verilog_code": "module test(input [7:0] a,b, output [7:0] sum); assign sum = a + b; endmodule",
    "optimization_level": "readable",
    "n_trials": 30
  }'
```

### Python客户端
```python
import requests

# 提交优化任务
response = requests.post("http://localhost:8000/optimize", json={
    "verilog_code": """
    module adder (
        input [7:0] a, b,
        output [7:0] sum
    );
        assign sum = a + b;
    endmodule
    """,
    "optimization_level": "readable",  # 默认策略 
    "n_trials": 30
})

job_id = response.json()["job_id"]

# 获取结果
result = requests.get(f"http://localhost:8000/result/{job_id}")
print(result.json()["optimized_code"])
```

## 🛠️ 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `verilog_code` | - | **必填**，Verilog RTL代码 |
| `optimization_level` | `"readable"` | 优化策略 |
| `n_trials` | `30` | 优化试验次数 |
| `timeout` | `300` | 超时时间（秒） |
| `delay_weight` | `0.1` | 延迟权重 |

## 📚 API端点

访问 http://localhost:8000/docs 查看完整文档

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/optimize` | POST | **主要接口**：提交优化任务 |
| `/status/{job_id}` | GET | 查询任务状态 |
| `/result/{job_id}` | GET | 获取优化结果 |
| `/jobs` | GET | 列出所有任务 |

## 🧪 测试验证

### 完整功能测试
```bash
python3 quick_test.py
```

### 手动验证
```bash
# 1. 启动服务
./start.sh &

# 2. 健康检查
curl http://localhost:8000/health

# 3. 简单测试
curl -X POST http://localhost:8000/optimize \
  -H "Content-Type: application/json" \
  -d '{"verilog_code":"module test(input a, output b); assign b = a; endmodule"}'
```

## 🔧 故障排除

### 常见问题

**Q: 安装脚本失败？**
```bash
# 手动安装依赖
sudo apt update
sudo apt install -y python3 python3-pip yosys build-essential

# 手动编译ABC
git clone https://github.com/berkeley-abc/abc.git
cd abc && make && sudo cp abc /usr/local/bin
```

**Q: 启动失败？**
```bash
# 检查端口占用
sudo netstat -tlpn | grep :8000

# 手动启动
source venv/bin/activate
python3 verilog_optimizer_api.py --port 8001  # 换个端口
```

**Q: 优化失败？**
- 检查Verilog语法是否正确
- 确保代码只包含组合逻辑（不支持时序逻辑）
- 尝试减少试验次数

## 📁 文件结构

```
verilog-optimizer-api/
├── verilog_optimizer_api.py    # API服务主文件
├── vop.py                      # 优化器核心
├── simple_install.sh           # 安装脚本
├── start.sh                    # 启动脚本  
├── quick_test.py               # 测试脚本
├── simple_requirements.txt     # Python依赖
└── SIMPLE_README.md           # 本文档
```

## ⚡ 快速命令参考

```bash
# 安装
./simple_install.sh

# 启动服务
./start.sh

# 后台启动
nohup ./start.sh > api.log 2>&1 &

# 停止服务
pkill -f verilog_optimizer_api

# 查看日志
tail -f api.log

# 测试API
python3 quick_test.py
```

## 🎯 使用场景

### 开发阶段
```bash
# 快速优化单个模块
curl -X POST localhost:8000/optimize -H "Content-Type: application/json" \
  -d '{"verilog_code":"你的代码", "optimization_level":"readable", "n_trials":20}'
```

### 批量处理
```python
# Python脚本批量处理多个文件
import os, requests

for file in os.listdir("verilog_files/"):
    with open(f"verilog_files/{file}") as f:
        code = f.read()
    
    result = requests.post("http://localhost:8000/optimize", json={
        "verilog_code": code,
        "optimization_level": "readable"
    })
    # 处理结果...
```

## 💡 最佳实践

1. **日常开发**: 使用 `readable` 策略，30次试验
2. **代码清理**: 使用 `minimal` 策略，快速优化 
3. **面积优化**: 使用 `balanced` 策略，增加试验次数
4. **生产环境**: 考虑使用 `systemd` 服务管理

## 🤝 技术支持

遇到问题？
1. 查看 `api.log` 日志文件
2. 运行 `python3 quick_test.py` 诊断
3. 检查系统依赖：`yosys -V` 和 `abc -q version`

---

**🎯 享受简化的Verilog优化体验！无需Docker，开箱即用！** 