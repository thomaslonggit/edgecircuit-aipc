import { SimulationResult } from './types';

/**
 * Mock local simulation function
 * This will be replaced with a real simulator in the future
 * 
 * @param code - Verilog code to simulate
 * @returns Promise that resolves to simulation results after 1 second
 */
export const runLocalSimulation = (code: string): Promise<SimulationResult> => {
  return new Promise((resolve) => {
    // Check if code is provided
    if (!code.trim()) {
      resolve({
        power: 0,
        frequency: 0,
        waveformUrl: '/src/assets/wave.png',
        timing: {
          maxDelay: 0,
          setupViolations: 0,
          holdViolations: 0
        }
      });
      return;
    }
    
    // 基于代码复杂度计算分析延迟
    const codeComplexity = code.length / 100;
    
    // 如果代码包含特定错误，生成相应的时序违例
    const hasBlockingAssignment = code.includes('tx_state = IDLE');
    const hasWidthMismatch = code.includes('tx_valid == 8\'b1');
    const hasMissingDefault = code.includes('// 错误3: 缺少默认分支');
    
    // 计算时序违例
    const setupViolations = hasBlockingAssignment ? Math.floor(Math.random() * 3) + 1 : 0;
    const holdViolations = hasWidthMismatch ? Math.floor(Math.random() * 2) + 1 : 0;
    
    // 根据违例情况调整最大延迟
    let maxDelay = 2.0 + (codeComplexity * 0.1) + (Math.random() * 0.5);
    
    // 错误会增加延迟
    if (hasBlockingAssignment) maxDelay += 0.8;
    if (hasWidthMismatch) maxDelay += 0.4;
    if (hasMissingDefault) maxDelay += 0.3;
    
    // 四舍五入到小数点后两位
    maxDelay = Math.round(maxDelay * 100) / 100;
    
    // Simulate a 1-second delay
    setTimeout(() => {
      // Generate random performance metrics based on code complexity
      
      // 时序问题影响频率
      const frequencyPenalty = setupViolations * 5 + holdViolations * 3;
      
      // 计算功耗 (错误会增加功耗)
      const powerBase = 10 + codeComplexity + Math.random() * 5;
      const powerPenalty = (hasBlockingAssignment ? 2 : 0) + (hasWidthMismatch ? 1 : 0) + (hasMissingDefault ? 0.5 : 0);
      const power = Math.round((powerBase + powerPenalty) * 10) / 10;
      
      // 计算频率 (错误会降低频率)
      const frequencyBase = 200 - codeComplexity + Math.random() * 50;
      const frequency = Math.round((frequencyBase - frequencyPenalty) * 10) / 10;
      
      resolve({
        power,
        frequency,
        waveformUrl: '/src/assets/wave.png',
        timing: {
          maxDelay,
          setupViolations,
          holdViolations
        }
      });
    }, 1000);
  });
}; 