import { LintError } from './types';

// 连接模式配置
const USE_PROXY = true; // 设置为 true 使用代理模式，false 使用直接连接

// API配置 - 支持代理和直接连接两种模式
const TINYBERT_CONFIG = {
  baseUrl: USE_PROXY ? '/api/tinybert' : 'http://127.0.0.1:5000',
  timeout: 10000, // 10秒超时
};

const LLM_CONFIG = {
  baseUrl: USE_PROXY ? '/api/llm' : 'http://localhost:8000',
  healthTimeout: 5000,      // 健康检查超时：5秒
  analysisTimeout: 120000,  // 代码分析超时：2分钟（120秒）
  defaultTimeout: 30000,    // 默认超时：30秒
};

// TinyBERT响应接口
interface TinyBERTResponse {
  device_used: string;
  errors: Array<{
    column: number;
    content: string;
    line: number;
  }>;
  inference_time_ms: number;
  lines_processed: number;
  processing_mode: string;
  total_lines: number;
}

// LLM响应接口（OpenAI兼容）
interface LLMChatResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface LLMHealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
  model_dir?: string;
}

// 模型连接状态
export interface ModelStatus {
  isConnected: boolean;
  lastCheckTime: number;
  latency: number;
  error?: string;
}

// 全局状态管理
class ModelServiceState {
  tinyBertStatus: ModelStatus = {
    isConnected: false,
    lastCheckTime: 0,
    latency: 0,
  };

  llmStatus: ModelStatus = {
    isConnected: false,
    lastCheckTime: 0,
    latency: 0,
  };

  // 状态变化监听器
  private listeners: Array<(tinyBert: ModelStatus, llm: ModelStatus) => void> = [];

  addListener(callback: (tinyBert: ModelStatus, llm: ModelStatus) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (tinyBert: ModelStatus, llm: ModelStatus) => void) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.tinyBertStatus, this.llmStatus);
    });
  }

  updateTinyBertStatus(status: Partial<ModelStatus>) {
    this.tinyBertStatus = { ...this.tinyBertStatus, ...status };
    this.notifyListeners();
  }

  updateLLMStatus(status: Partial<ModelStatus>) {
    this.llmStatus = { ...this.llmStatus, ...status };
    this.notifyListeners();
  }
}

export const modelState = new ModelServiceState();

// 网络请求工具函数 - 优化CORS处理
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// TinyBERT语法检查 - 支持代理模式
export async function checkCodeWithTinyBERT(code: string): Promise<LintError[]> {
  const startTime = Date.now();
  
  try {
    // 使用POST请求，支持代理模式
    const response = await fetchWithTimeout(
      `${TINYBERT_CONFIG.baseUrl}/check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      },
      TINYBERT_CONFIG.timeout
    );

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: TinyBERTResponse = await response.json();
    
    // 更新连接状态
    modelState.updateTinyBertStatus({
      isConnected: true,
      lastCheckTime: endTime,
      latency,
      error: undefined,
    });

    // 转换为应用内部的错误格式
    const lintErrors: LintError[] = result.errors.map(error => ({
      line: error.line,
      column: error.column,
      message: error.content,
      severity: 'error' as const,
      code: `TINYBERT_${error.line}_${error.column}`,
    }));

    return lintErrors;
  } catch (error) {
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // 更新连接状态
    modelState.updateTinyBertStatus({
      isConnected: false,
      lastCheckTime: endTime,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('TinyBERT API error:', error);
    if (!USE_PROXY) {
      console.error('如果看到CORS错误，请设置 USE_PROXY = true 或确保后端API支持CORS');
      console.error('解决方案：', getCORSSolution());
    }
    
    // 返回空数组，让用户知道检查失败但不阻止使用
    return [];
  }
}

// LLM健康检查 - 支持代理模式
export async function checkLLMHealth(): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    const response = await fetchWithTimeout(
      `${LLM_CONFIG.baseUrl}/health`,
      {
        method: 'GET',
        // 移除不必要的头部
      },
      LLM_CONFIG.healthTimeout // 使用健康检查专用的较短超时
    );

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: LLMHealthResponse = await response.json();
    
    // 修复：检查status是否为"healthy"（而不是"ok"）
    const isHealthy = result.status === 'healthy' && result.model_loaded;
    
    // 更新连接状态
    modelState.updateLLMStatus({
      isConnected: isHealthy,
      lastCheckTime: endTime,
      latency,
      error: isHealthy ? undefined : `Status: ${result.status}, Model loaded: ${result.model_loaded}`,
    });

    console.log('LLM健康检查结果:', {
      status: result.status,
      model_loaded: result.model_loaded,
      device: result.device,
      model_dir: result.model_dir,
      isHealthy: isHealthy,
      latency: latency
    });

    return isHealthy;
  } catch (error) {
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // 更新连接状态
    modelState.updateLLMStatus({
      isConnected: false,
      lastCheckTime: endTime,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('LLM health check error:', error);
    if (!USE_PROXY) {
      console.error('如果看到CORS错误，请设置 USE_PROXY = true 或确保后端API支持CORS');
      console.error('解决方案：', getCORSSolution());
    }
    return false;
  }
}

// LLM代码分析 - 支持代理模式，使用更长的超时时间
export async function analyzeCodeWithLLM(prompt: string): Promise<string> {
  const startTime = Date.now();
  
  try {
    console.log('开始LLM代码分析，预计等待时间: 30-120秒...');
    
    const response = await fetchWithTimeout(
      `${LLM_CONFIG.baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen2.5-7b-int4',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的Verilog/SystemVerilog硬件描述语言专家，擅长分析HDL代码中的问题并提供详细的解释和修复建议。请用中文回答，并提供具体的代码示例。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 500,
          stream: false,
        }),
      },
      LLM_CONFIG.analysisTimeout // 使用专门的分析超时时间（2分钟）
    );

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: LLMChatResponse = await response.json();
    
    // 更新连接状态
    modelState.updateLLMStatus({
      isConnected: true,
      lastCheckTime: endTime,
      latency,
      error: undefined,
    });

    console.log(`LLM代码分析完成，耗时: ${latency}ms (${(latency/1000).toFixed(1)}秒)`);

    return result.choices[0]?.message?.content || '无法获取分析结果';
  } catch (error) {
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // 更新连接状态
    modelState.updateLLMStatus({
      isConnected: false,
      lastCheckTime: endTime,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('LLM analysis error:', error);
    console.error(`分析失败，耗时: ${latency}ms (${(latency/1000).toFixed(1)}秒)`);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`LLM分析超时（超过${LLM_CONFIG.analysisTimeout/1000}秒），请稍后重试`);
    }
    
    if (!USE_PROXY) {
      console.error('如果看到CORS错误，请设置 USE_PROXY = true 或确保后端API支持CORS');
      console.error('解决方案：', getCORSSolution());
    }
    throw error;
  }
}

// 定期健康检查
export function startHealthMonitoring(intervalMs: number = 30000) {
  // 立即执行一次检查
  checkLLMHealth();
  
  // 定期检查
  setInterval(async () => {
    await checkLLMHealth();
  }, intervalMs);
}

// 导出便捷函数
export function getTinyBertStatus(): ModelStatus {
  return modelState.tinyBertStatus;
}

export function getLLMStatus(): ModelStatus {
  return modelState.llmStatus;
}

export function subscribeToStatusChanges(callback: (tinyBert: ModelStatus, llm: ModelStatus) => void) {
  modelState.addListener(callback);
  return () => modelState.removeListener(callback);
}

// 辅助函数：检查是否为CORS错误
export function isCORSError(error: Error): boolean {
  return error.message.includes('CORS') || 
         error.message.includes('Access-Control-Allow-Origin') ||
         error.message.includes('Cross-Origin Request Blocked');
}

// 辅助函数：提供CORS解决方案建议
export function getCORSSolution(): string {
  return `
CORS解决方案：

方案1: 使用代理模式 (推荐)
- 在 src/utils/modelService.ts 中设置 USE_PROXY = true
- 重启开发服务器 (npm run dev)
- 代理会自动处理CORS问题

方案2: 后端API添加CORS头部
1. 对于TinyBERT服务 (Flask示例)：
   from flask_cors import CORS
   app = Flask(__name__)
   CORS(app)

2. 对于LLM服务，在响应中添加：
   headers: {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
     'Access-Control-Allow-Headers': 'Content-Type'
   }

方案3: 手动处理OPTIONS请求
- 后端需要响应OPTIONS预检请求
- 返回适当的CORS头部

当前配置：
- 代理模式：${USE_PROXY ? '已启用' : '已禁用'}
- TinyBERT URL：${TINYBERT_CONFIG.baseUrl}
- LLM URL：${LLM_CONFIG.baseUrl}
- LLM健康检查超时：${LLM_CONFIG.healthTimeout/1000}秒
- LLM分析超时：${LLM_CONFIG.analysisTimeout/1000}秒
  `;
}

// 导出配置信息
export function getAPIConfiguration() {
  return {
    useProxy: USE_PROXY,
    tinyBertUrl: TINYBERT_CONFIG.baseUrl,
    llmUrl: LLM_CONFIG.baseUrl,
    timeouts: {
      tinyBert: TINYBERT_CONFIG.timeout,
      llmHealth: LLM_CONFIG.healthTimeout,
      llmAnalysis: LLM_CONFIG.analysisTimeout,
    }
  };
} 