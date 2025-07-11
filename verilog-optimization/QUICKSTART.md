# ⚡ 快速上手指南

## 🎯 三条命令搞定

```bash
# 1. 安装
chmod +x simple_install.sh start.sh
./simple_install.sh

# 2. 启动
./start.sh

# 3. 测试（新开终端）
python3 quick_test.py
```

## 🔧 基本使用

### 直接调用API
```bash
curl -X POST http://localhost:8000/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "verilog_code": "module test(input [7:0] a,b, output [7:0] sum); assign sum = a + b; endmodule",
    "optimization_level": "readable"
  }'
```

### Python脚本
```python
import requests

# 优化Verilog代码
response = requests.post("http://localhost:8000/optimize", json={
    "verilog_code": "你的Verilog代码",
    "optimization_level": "readable",  # 默认策略：可读优化
    "n_trials": 30                     # 迭代次数
})

job_id = response.json()["job_id"]
result = requests.get(f"http://localhost:8000/result/{job_id}")
print(result.json()["optimized_code"])
```

## 📚 更多信息

- **完整文档**: 查看 `SIMPLE_README.md`
- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

## 🛠️ 故障排除

```bash
# 检查服务状态
curl http://localhost:8000/health

# 查看进程
ps aux | grep verilog_optimizer_api

# 重启服务
pkill -f verilog_optimizer_api
./start.sh
```

就这么简单！🚀 