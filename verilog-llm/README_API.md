# Intel AIPC OpenVINO GenAI API Server

基于 OpenVINO GenAI 的 OpenAI 兼容 API 服务，让你能够通过标准的 OpenAI API 格式调用本地部署的大语言模型。

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装 API 服务器依赖
pip install -r requirements.txt

# 安装客户端示例依赖 (如需运行示例)
pip install requests
```

### 2. 启动服务器

```bash
python api_server.py
```

服务器将在 `http://localhost:8000` 启动。

### 3. 验证服务

访问以下端点验证服务是否正常：

- **API 文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health
- **模型列表**: http://localhost:8000/v1/models

## 📡 API 接口

### 聊天完成 (Chat Completions)

**POST** `/v1/chat/completions`

兼容 OpenAI 的聊天完成接口，支持流式和非流式响应。

**请求示例**:

```json
{
  "model": "qwen2.5-7b-int4",
  "messages": [
    {
      "role": "user",
      "content": "你好！"
    }
  ],
  "temperature": 0.2,
  "max_tokens": 640,
  "stream": false
}
```

**参数说明**:

- `model`: 模型名称 (默认: "qwen2.5-7b-int4")
- `messages`: 对话消息列表
- `temperature`: 采样温度 (0-2, 默认: 0.2)
- `max_tokens`: 最大生成 token 数 (默认: 640)
- `stream`: 是否流式返回 (默认: false)
- `top_p`: 核采样参数 (0-1, 默认: 1.0)

### 模型列表 (Models)

**GET** `/v1/models`

获取可用模型列表。

### 健康检查 (Health)

**GET** `/health`

检查服务健康状态和模型加载情况。

## 💻 使用示例

### Python 客户端

运行提供的示例客户端：

```bash
python api_client_example.py
```

### curl 命令

**非流式请求**:

```bash
curl -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-7b-int4",
    "messages": [
      {"role": "user", "content": "你好！"}
    ],
    "temperature": 0.2,
    "max_tokens": 100
  }'
```

**流式请求**:

```bash
curl -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-7b-int4",
    "messages": [
      {"role": "user", "content": "你好！"}
    ],
    "stream": true
  }' \
  --no-buffer
```

### OpenAI Python SDK

你也可以直接使用 OpenAI 的 Python SDK：

```python
from openai import OpenAI

# 配置客户端指向本地服务
client = OpenAI(
    api_key="dummy",  # 本地服务不需要真实 API Key
    base_url="http://localhost:8000/v1"
)

# 发送聊天请求
response = client.chat.completions.create(
    model="qwen2.5-7b-int4",
    messages=[
        {"role": "user", "content": "你好！"}
    ],
    temperature=0.2,
    max_tokens=100
)

print(response.choices[0].message.content)
```

## ⚙️ 配置

在 `api_server.py` 文件顶部修改配置：

```python
# ==== 配置参数 ====
MODEL_DIR = r".\qwen2.5-ov-int4"    # 模型目录
DEVICE = "AUTO:NPU,GPU"             # 运行设备
MAX_NEW_TOKENS = 640                # 默认最大 token 数
# ==================
```

## 🔧 高级用法

### 自定义端口

```bash
python api_server.py
# 或在代码中修改 uvicorn.run() 的 port 参数
```

### 部署到生产环境

```bash
# 使用 gunicorn + uvicorn workers
pip install gunicorn

gunicorn api_server:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM python:3.10

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "api_server.py"]
```

## 🎯 特性

- ✅ **OpenAI 兼容**: 支持标准的 OpenAI API 格式
- ✅ **流式响应**: 支持实时流式文本生成
- ✅ **多轮对话**: 自动管理对话上下文
- ✅ **高性能**: 基于 Intel AIPC 和 OpenVINO 优化
- ✅ **易集成**: 可直接替换 OpenAI API 端点
- ✅ **轻量级**: 小而美的设计，易于部署

## 🔍 故障排除

### 模型加载失败

1. 检查模型路径是否正确
2. 确保模型文件完整
3. 验证设备配置 (NPU/GPU 支持)

### API 请求失败

1. 检查服务器是否正在运行
2. 验证端口是否被占用
3. 查看服务器日志输出

### 性能优化

1. 调整 `PERFORMANCE_HINT` 设置
2. 配置合适的 `CACHE_DIR`
3. 根据硬件选择最佳 `DEVICE` 配置

## 📝 许可证

Apache-2.0 License 