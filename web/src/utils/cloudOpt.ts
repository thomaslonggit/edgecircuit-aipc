import { OptimizationResult } from './types';

// API配置 - 使用代理路径避免CORS问题
const API_BASE_URL = '/api/optimization';

/**
 * 检查优化API服务状态
 */
const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.status === 200;
  } catch (error) {
    console.error('API健康检查失败:', error);
    return false;
  }
};

/**
 * 提交优化任务
 */
const submitOptimizationJob = async (code: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      verilog_code: code,
      optimization_level: 'readable',  // 使用readable策略，适合日常开发
      n_trials: 15
    }),
  });

  if (!response.ok) {
    throw new Error(`提交优化任务失败: ${response.statusText}`);
  }

  const result = await response.json();
  return result.job_id;
};

/**
 * 查询任务状态
 */
const checkJobStatus = async (jobId: string): Promise<{ status: string; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/status/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`查询任务状态失败: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * 获取优化结果
 */
const getOptimizationResult = async (jobId: string): Promise<OptimizationResult> => {
  const response = await fetch(`${API_BASE_URL}/result/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`获取优化结果失败: ${response.statusText}`);
  }

  const result = await response.json();
  
  // 如果优化失败，抛出错误
  if (result.status !== 'completed') {
    throw new Error(result.error_details || '优化失败');
  }

  return result;
};

/**
 * 真实的云端优化函数
 * 调用实际的优化API服务
 * 
 * @param code - Verilog代码
 * @param onProgress - 进度回调函数 (0-100)
 * @returns Promise 返回优化结果
 */
export const runCloudOptimization = async (
  code: string,
  onProgress: (progress: number) => void
): Promise<OptimizationResult> => {
  // 检查代码是否为空
  if (!code.trim()) {
    throw new Error('请输入Verilog代码');
  }

  try {
    // 1. 检查API服务状态
    onProgress(5);
    const isHealthy = await checkApiHealth();
    if (!isHealthy) {
      throw new Error('优化服务不可用，请确保后端服务正在运行在 http://localhost:8001');
    }

    // 2. 提交优化任务
    onProgress(15);
    const jobId = await submitOptimizationJob(code);
    console.log(`✅ 优化任务已提交，ID: ${jobId}`);

    // 3. 轮询任务状态
    let progress = 20;
    let lastMessage = '';
    
    while (true) {
      try {
        const status = await checkJobStatus(jobId);
        
        // 更新进度（从20%到90%）
        if (status.status === 'running') {
          progress = Math.min(progress + 5, 85);
          onProgress(progress);
        }
        
        // 如果状态消息变化，输出日志
        if (status.message !== lastMessage) {
          console.log(`📊 ${status.status}: ${status.message}`);
          lastMessage = status.message;
        }
        
        // 检查任务是否完成
        if (status.status === 'completed') {
          onProgress(90);
          break;
        }
        
        if (status.status === 'failed') {
          throw new Error(`优化任务失败: ${status.message}`);
        }
        
        // 等待2秒后继续轮询
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error('查询任务状态出错:', error);
        throw new Error(`无法查询任务状态: ${error}`);
      }
    }

    // 4. 获取优化结果
    onProgress(95);
    const result = await getOptimizationResult(jobId);
    
    console.log('✅ 优化成功完成!');
    onProgress(100);
    
    return result;

  } catch (error) {
    console.error('优化过程出错:', error);
    throw error;
  }
}; 