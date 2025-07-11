# 🚀 Verilog Logic Optimizer API

基于贝叶斯优化的Verilog RTL逻辑优化REST API服务，运行在Ubuntu 22.04上。

## ✨ 特性

- 🎯 **智能优化**：使用贝叶斯优化搜索最佳优化序列
- 🔧 **多种策略**：支持5种不同的优化策略
- 📖 **可读输出**：默认生成清晰可读的Verilog代码
- ⚡ **异步处理**：支持后台任务处理
- 📚 **自动文档**：提供Swagger UI和ReDoc文档
- 🐳 **容器化**：支持Docker部署
- 🔍 **健康监控**：内置健康检查和日志

## 🔧 快速开始

### 方式1: 自动安装（推荐）

```bash
# 克隆项目
git clone <your-repo>
cd verilog-optimizer-api

# 运行安装脚本
chmod +x install.sh
./install.sh

# 启动服务
./start_api.sh
```

### 方式2: Docker部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式3: 手动安装

```bash
# 安装系统依赖
sudo apt update
sudo apt install -y python3 python3-pip yosys build-essential

# 安装ABC工具
git clone https://github.com/berkeley-abc/abc.git
cd abc && make -j$(nproc) && sudo cp abc /usr/local/bin

# 安装Python依赖
pip3 install -r requirements.txt

# 启动服务
python3 verilog_optimizer_api.py
```

## 📋 API接口

服务启动后，访问以下地址查看文档：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 主要端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/` | API根信息 |
| GET | `/health` | 健康检查 |
| POST | `/optimize` | 提交优化任务 |
| GET | `/status/{job_id}` | 查询任务状态 |
| GET | `/result/{job_id}` | 获取优化结果 |
| GET | `/jobs` | 列出所有任务 |
| POST | `/optimize/file` | 文件上传优化 |

## 🎛️ 优化策略

| 策略 | 说明 | 适用场景 | 特点 |
|------|------|----------|------|
| `minimal` | 最小优化 | 日常开发 | 保持RTL结构，最小改动 |
| `readable` | 可读优化 ⭐ | 项目维护 | **默认策略**，清晰可读 |
| `balanced` | 平衡优化 | 面积要求 | 兼顾大小和可读性 |
| `yosys_only` | 纯Yosys | 兼容性 | 不使用ABC，避免工具问题 |
| `aggressive` | 激进优化 | 极限面积 | 最小门数，但难以阅读 |

## 📖 使用示例

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

# 查询结果
result = requests.get(f"http://localhost:8000/result/{job_id}")
print(result.json()["optimized_code"])
```

### curl命令

```bash
# 提交任务
curl -X POST "http://localhost:8000/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "verilog_code": "module test(input a, output b); assign b = a; endmodule",
    "optimization_level": "readable",
    "n_trials": 20
  }'

# 查询状态
curl "http://localhost:8000/status/{job_id}"

# 获取结果
curl "http://localhost:8000/result/{job_id}"
```

### 客户端示例

运行完整的客户端示例：

```bash
# 安装requests库
pip3 install requests

# 运行示例
python3 api_client_example.py
```

## 🛠️ 配置参数

### 请求参数

| 参数 | 类型 | 默认值 | 范围 | 说明 |
|------|------|--------|------|------|
| `verilog_code` | string | - | - | **必填**，Verilog RTL代码 |
| `optimization_level` | enum | `readable` | 见策略表 | 优化策略 |
| `n_trials` | int | 30 | 5-500 | 优化试验次数 |
| `seq_length` | int | 6 | 2-12 | 优化序列长度 |
| `delay_weight` | float | 0.1 | 0.0-1.0 | 延迟权重 |
| `timeout` | int | 300 | 30-3600 | 超时时间（秒） |
| `top_module` | string | null | - | 顶层模块名（可选） |

### 服务启动参数

```bash
python3 verilog_optimizer_api.py \
  --host 0.0.0.0 \      # 服务地址
  --port 8000 \         # 服务端口
  --workers 1 \         # 工作进程数
  --reload              # 开发模式（自动重载）
```

## 📊 响应格式

### 成功响应

```json
{
  "job_id": "job_1234567890_abcd1234",
  "status": "completed",
  "message": "优化完成",
  "optimized_code": "module test(...); ... endmodule",
  "baseline_code": "module test(...); ... endmodule",
  "optimization_stats": {
    "original_lines": 15,
    "optimized_lines": 12,
    "line_reduction": 3,
    "original_wires": 5,
    "optimized_wires": 3,
    "wire_reduction": 2,
    "strategy_used": "readable",
    "trials_completed": 30
  },
  "execution_time": 25.6
}
```

### 错误响应

```json
{
  "job_id": "job_1234567890_abcd1234",
  "status": "failed",
  "message": "优化失败",
  "error_details": "Verilog语法错误: 第5行..."
}
```

## 🧪 测试

### API功能测试

```bash
# 确保服务运行
python3 verilog_optimizer_api.py &

# 运行测试脚本
chmod +x test_api.sh
./test_api.sh
```

### 策略对比测试

```bash
# 运行对比测试
python3 test_comparison.py
```

## 📋 系统要求

### 硬件要求

- **CPU**: 2核以上（推荐4核）
- **内存**: 4GB以上（推荐8GB）
- **存储**: 2GB可用空间
- **网络**: 支持HTTP/HTTPS

### 软件要求

- **操作系统**: Ubuntu 22.04 LTS（推荐）
- **Python**: 3.8+
- **Yosys**: 0.9+
- **ABC**: 最新版本

### 工具链

必需工具：
- `yosys` - Verilog综合工具
- `abc` - 逻辑优化工具
- `python3` - Python运行环境
- `curl` - API测试工具（可选）
- `jq` - JSON处理工具（可选）

## 🔧 故障排除

### 常见问题

#### 1. API服务启动失败

```bash
# 检查端口占用
sudo netstat -tlpn | grep :8000

# 检查Python版本
python3 --version

# 检查依赖
pip3 list | grep fastapi
```

#### 2. 优化工具不可用

```bash
# 检查Yosys
yosys -V

# 检查ABC
abc -q "version"

# 重新安装ABC
sudo apt remove abc-*
# 然后按照安装脚本重新编译
```

#### 3. 优化失败

常见原因：
- Verilog语法错误
- 包含不支持的构造（如时序逻辑）
- 内存不足
- 超时

```bash
# 查看详细日志
tail -f verilog_optimizer_api.log

# 检查系统资源
top
df -h
```

#### 4. Docker相关问题

```bash
# 重新构建镜像
docker-compose build --no-cache

# 查看容器日志
docker-compose logs verilog-optimizer

# 进入容器调试
docker-compose exec verilog-optimizer bash
```

### 性能调优

#### 1. 调整试验次数

```python
# 快速测试
"n_trials": 10

# 日常使用
"n_trials": 30

# 精细优化
"n_trials": 100
```

#### 2. 内存优化

```bash
# 设置环境变量限制内存使用
export MALLOC_ARENA_MAX=2
python3 verilog_optimizer_api.py
```

#### 3. 并发控制

```python
# 限制同时运行的任务数
# 在API代码中可以添加信号量控制
```

## 📝 开发指南

### 添加新的优化策略

1. 在 `vop.py` 中添加新的优化函数
2. 在 `OptimizationStrategy` 枚举中添加新策略
3. 在API服务中注册新策略
4. 更新文档和测试

### 扩展API功能

```python
# 添加新的端点
@app.post("/optimize/batch")
async def optimize_batch(files: List[UploadFile]):
    # 批量优化实现
    pass
```

### 添加监控

```python
# 添加Prometheus指标
from prometheus_client import Counter, Histogram

optimization_requests = Counter('optimization_requests_total')
optimization_duration = Histogram('optimization_duration_seconds')
```

## 🤝 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送分支
5. 创建Pull Request

## 📄 许可证

MIT License

## 🔗 相关链接

- [Yosys文档](http://www.clifford.at/yosys/documentation.html)
- [ABC文档](https://people.eecs.berkeley.edu/~alanmi/abc/)
- [FastAPI文档](https://fastapi.tiangolo.com/)
- [Optuna文档](https://optuna.readthedocs.io/)

---

**🎯 享受智能化的Verilog优化体验！** 