# AI模型集成说明文档

## 概述

本平台已成功集成两个本地机器学习模型：

1. **TinyBERT模型** - 用于实时Verilog代码语法检查
2. **LLM模型 (HDL-LLM-7B)** - 用于深度代码分析和错误解释

## 功能特性

### 🔍 TinyBERT语法检查
- **实时检查**：当用户修改Verilog代码时，自动调用TinyBERT进行语法检查
- **低延迟**：通常在10-100ms内完成检查
- **智能fallback**：如果TinyBERT服务不可用，自动切换到本地基础检查
- **错误标记**：在编辑器中直接标记有问题的代码行

### 🧠 LLM深度分析
- **智能解释**：为语法错误提供详细的中文解释
- **修复建议**：提供具体的代码修复示例
- **上下文感知**：根据错误类型生成针对性的分析提示
- **优雅降级**：LLM不可用时提供预定义的专业解释
- **Intel GPU/NPU加速**：使用Intel GPU/NPU自动调度进行高性能AI推理计算

### 📊 连接状态监测
- **实时状态**：显示两个模型的连接状态和延迟
- **健康检查**：定期检查模型服务的可用性
- **错误处理**：清晰显示连接错误和恢复状态
- **状态指示**：直观的颜色和图标显示系统状态

## 🚨 CORS问题解决方案

### 问题说明
浏览器出于安全考虑，会阻止跨域请求。当前端应用向后端API发送请求时，浏览器会先发送OPTIONS预检请求，如果后端不支持CORS，则会被阻止。

### 解决方案

#### 方案1：使用代理模式（推荐）✅
```typescript
// 在 src/utils/modelService.ts 中
const USE_PROXY = true; // 设置为 true 启用代理模式
```

**优点**：
- 无需修改后端代码
- 开发环境下完全避免CORS问题
- 自动处理所有跨域请求

**配置**：
```typescript
// vite.config.ts 已配置代理
proxy: {
  '/api/tinybert': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/tinybert/, ''),
  },
  '/api/llm': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/llm/, ''),
  },
}
```

#### 方案2：后端添加CORS支持
**对于TinyBERT服务（Flask）**：
```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 启用CORS支持

@app.route('/check', methods=['POST', 'OPTIONS'])
def check_code():
    if request.method == 'OPTIONS':
        # 处理预检请求
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        return response
    
    # 处理实际请求
    code = request.json.get('code')
    # ... 处理逻辑
    return jsonify(result)
```

**对于LLM服务**：
```python
# 在响应中添加CORS头部
headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
}
```

#### 方案3：直接连接模式
```typescript
// 在 src/utils/modelService.ts 中
const USE_PROXY = false; // 设置为 false 使用直接连接
```

**注意**：使用此模式时，后端必须正确配置CORS。

## API接口配置

### TinyBERT配置
```typescript
const TINYBERT_CONFIG = {
  baseUrl: USE_PROXY ? '/api/tinybert' : 'http://127.0.0.1:5000',
  timeout: 10000, // 10秒超时
};
```

**接口格式：**
- **请求**：`POST /check`
- **数据**：`{"code": "Verilog代码内容"}`
- **响应**：
```json
{
  "device_used": "NPU",
  "errors": [
    {
      "column": 1,
      "content": "错误描述",
      "line": 7
    }
  ],
  "inference_time_ms": 253.55,
  "lines_processed": 12,
  "processing_mode": "batch",
  "total_lines": 13
}
```

### LLM配置
```typescript
const LLM_CONFIG = {
  baseUrl: USE_PROXY ? '/api/llm' : 'http://localhost:8000',
  healthTimeout: 5000,      // 健康检查超时：5秒
  analysisTimeout: 120000,  // 代码分析超时：2分钟（120秒）
  defaultTimeout: 30000,    // 默认超时：30秒
};
```

**接口格式：**
- **健康检查**：`GET /health`
  **响应示例**：
  ```json
  {
    "status": "healthy",
    "model_loaded": true,
    "device": "AUTO:NPU,GPU",
    "model_dir": ".\\qwen2.5-ov-int4"
  }
  ```
- **聊天分析**：`POST /v1/chat/completions` (OpenAI兼容格式)
  **注意**：此接口可能需要30-120秒的处理时间，请耐心等待

## 使用方法

### 1. 启动模型服务

**TinyBERT服务：**
```bash
# 确保TinyBERT服务在端口5000上运行
curl http://127.0.0.1:5000/check -X POST -H "Content-Type: application/json" -d '{"code":"module test; endmodule"}'
```

**LLM服务：**
```bash
# 确保LLM服务在端口8000上运行
curl http://localhost:8000/health
```

### 2. 启动前端应用
```bash
npm run dev
```

### 3. 使用功能

1. **自动语法检查**：
   - 在编辑器中输入或修改Verilog代码
   - 系统会自动在300ms后调用TinyBERT进行检查
   - 错误会在编辑器和错误列表中显示

2. **详细错误分析**：
   - 点击错误列表中的"详细解释"按钮
   - 系统调用LLM生成详细的错误解释和修复建议
   - 结果显示在侧边抽屉中

3. **连接状态监控**：
   - 查看顶部状态栏了解模型连接情况
   - 绿色表示已连接，灰色表示未连接，红色表示错误

## 文件结构

```
src/
├── utils/
│   ├── modelService.ts     # 模型API服务层
│   ├── lintStub.ts         # 语法检查（已集成TinyBERT）
│   └── aiStub.ts          # AI分析（已集成LLM）
├── components/
│   └── LocalModelStatus.tsx # 模型状态显示组件
├── App.tsx                # 主应用（已更新为异步API）
├── vite.config.ts         # Vite配置（包含代理设置）
└── ...
```

## 核心功能模块

### modelService.ts
- `checkCodeWithTinyBERT()` - TinyBERT语法检查
- `analyzeCodeWithLLM()` - LLM代码分析
- `checkLLMHealth()` - LLM健康检查
- `startHealthMonitoring()` - 启动健康监测
- `subscribeToStatusChanges()` - 状态变化订阅
- `getAPIConfiguration()` - 获取当前API配置

### 错误处理策略
1. **网络超时**：自动使用本地fallback
2. **服务不可用**：显示错误状态，提供基础功能
3. **CORS错误**：提供详细的解决方案建议
4. **连接中断**：定期重试连接

## 监控和调试

### 状态查看
- 实时延迟显示在顶部状态栏
- 连接状态通过颜色和图标表示
- 错误信息在tooltip中显示

### 调试日志
```javascript
// 在浏览器控制台查看详细日志
console.log('TinyBERT状态:', getTinyBertStatus());
console.log('LLM状态:', getLLMStatus());
console.log('API配置:', getAPIConfiguration());
```

### 健康检查
系统每30秒自动检查LLM服务健康状态，TinyBERT状态在每次代码检查时更新。

## 性能特性与超时优化

### ⚡ 超时策略优化
- **TinyBERT语法检查**：10秒超时，适合实时语法检查
- **LLM健康检查**：5秒超时，快速状态检测
- **LLM代码分析**：120秒（2分钟）超时，适应深度分析需求
- **智能超时处理**：区分不同错误类型，提供针对性的用户反馈

### 🔄 用户体验优化
- **预期时间提示**：用户发起LLM分析时，明确告知预计等待时间（30-120秒）
- **实时进度反馈**：加载指示器显示当前处理状态
- **超时错误处理**：超时时提供清晰的错误信息和重试建议
- **优雅降级**：分析失败时自动提供本地预定义解释

### 📊 性能指标
- **TinyBERT**：毫秒级响应，适合实时语法检查
- **LLM**：30-120秒响应，适合深度分析（取决于代码复杂度和模型负载）
- **智能缓存**：避免重复的API调用
- **异步处理**：不阻塞用户界面操作

## 故障排除

### 常见问题

1. **看到OPTIONS请求而非POST/GET**
   - 这是CORS预检请求
   - **解决方案**：启用代理模式或配置后端CORS

2. **TinyBERT连接失败**
   - 检查服务是否在127.0.0.1:5000运行
   - 确认防火墙设置
   - 尝试启用代理模式

3. **LLM响应超时**
   - 检查模型是否正确加载
   - 确认服务在localhost:8000运行
   - 查看系统资源使用情况
   - **注意**：LLM分析需要30-120秒，请耐心等待

4. **LLM分析时间过长**
   - **正常现象**：复杂代码分析可能需要1-2分钟
   - **建议**：等待过程中可以继续编辑代码
   - **优化建议**：确保LLM服务有足够的系统资源
   - **如果超过2分钟**：系统会自动超时并提供重试选项

5. **CORS错误**
   - **推荐**：设置 `USE_PROXY = true`
   - 或配置后端CORS支持
   - 重启开发服务器

### 配置切换

#### 切换到代理模式
```typescript
// 在 src/utils/modelService.ts 中
const USE_PROXY = true;
```

#### 切换到直接连接模式
```typescript
// 在 src/utils/modelService.ts 中
const USE_PROXY = false;
```

#### 调整超时配置
```typescript
// 在 src/utils/modelService.ts 中调整超时时间
const LLM_CONFIG = {
  baseUrl: USE_PROXY ? '/api/llm' : 'http://localhost:8000',
  healthTimeout: 5000,      // 健康检查超时：5秒
  analysisTimeout: 120000,  // 代码分析超时：2分钟（可根据需要调整）
  defaultTimeout: 30000,    // 默认超时：30秒
};
```

**注意**：修改配置后需要重启开发服务器。

### 超时配置建议
- **开发环境**：建议保持当前配置（2分钟）
- **生产环境**：可根据服务器性能适当调整
- **高负载环境**：可考虑增加到180秒（3分钟）
- **低延迟需求**：可降低到60秒，但可能影响复杂分析的完成率

### 日志位置
- 浏览器开发者工具 -> Console
- 网络请求详情 -> Network tab
- 应用状态 -> React DevTools

## 扩展说明

### 添加新的检查规则
在`modelService.ts`中修改API调用参数或在`lintStub.ts`中添加本地fallback规则。

### 自定义LLM提示词
在`aiStub.ts`的`createAnalysisPrompt()`函数中修改提示词模板。

### 调整连接超时
修改`modelService.ts`中的`TINYBERT_CONFIG`和`LLM_CONFIG`配置：
```typescript
// 示例：调整LLM分析超时到3分钟
const LLM_CONFIG = {
  baseUrl: USE_PROXY ? '/api/llm' : 'http://localhost:8000',
  healthTimeout: 5000,      // 健康检查超时
  analysisTimeout: 180000,  // 代码分析超时：3分钟
  defaultTimeout: 30000,    // 默认超时
};
```

### 生产环境配置
在生产环境中，建议：
1. 使用环境变量配置API端点
2. 配置后端CORS而非使用代理
3. 添加API认证和安全措施

---

该集成实现了小而美、稳定运行、逻辑清晰的设计原则，并提供了完整的CORS解决方案，确保在不同环境下都能正常工作。 