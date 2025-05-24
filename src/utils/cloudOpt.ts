import { OptimizationResult, ParetoPoint } from './types';

/**
 * Mock cloud optimization function
 * This will be replaced with a real cloud optimization service in the future
 * 
 * @param code - Verilog code to optimize
 * @param onProgress - Callback function to report progress (0-100)
 * @returns Promise that resolves to optimization results after 10 seconds
 */
export const runCloudOptimization = (
  code: string,
  onProgress: (progress: number) => void
): Promise<OptimizationResult> => {
  return new Promise((resolve) => {
    // Check if code is provided
    if (!code.trim()) {
      resolve({
        powerBefore: 0,
        powerAfter: 0,
        frequencyBefore: 0,
        frequencyAfter: 0,
        powerImprovement: 0,
        frequencyImprovement: 0,
        areaBefore: 0,
        areaAfter: 0,
        areaImprovement: 0,
        chipUtilization: 0,
        optimizationTechniques: [],
        chipLayoutUrl: '/src/assets/wave.png', // 实际项目中应该替换为真实的芯片布局图
        paretoPoints: []
      });
      return;
    }
    
    // Generate base metrics based on code complexity
    const codeComplexity = code.length / 100;
    const powerBefore = Math.round((10 + codeComplexity + Math.random() * 5) * 10) / 10;
    const frequencyBefore = Math.round((200 - codeComplexity + Math.random() * 50) * 10) / 10;
    const areaBefore = Math.round((5000 + codeComplexity * 200 + Math.random() * 500) * 10) / 10;
    
    // 如果代码包含特定错误，生成相应的优化策略
    const hasBlockingAssignment = code.includes('tx_state = IDLE');
    const hasWidthMismatch = code.includes('tx_valid == 8\'b1');
    const hasMissingDefault = code.includes('// 错误3: 缺少默认分支');
    
    // 优化技术列表
    const optimizationTechniques = [];
    
    // 根据代码中的问题确定优化技术
    if (hasBlockingAssignment) {
      optimizationTechniques.push('时序优化: 非阻塞赋值转换');
    }
    
    if (hasWidthMismatch) {
      optimizationTechniques.push('位宽匹配优化: 信号比较精确化');
    }
    
    if (hasMissingDefault) {
      optimizationTechniques.push('逻辑优化: case语句完整性检查');
    }
    
    // 添加常见的其他优化技术
    optimizationTechniques.push('时钟门控');
    optimizationTechniques.push('资源共享');
    optimizationTechniques.push('常数传播');
    
    // 生成随机但合理的优化结果
    // 不同错误改进的幅度不同
    const powerOptFactor = 0.78 - (hasBlockingAssignment ? 0.05 : 0) - (hasWidthMismatch ? 0.02 : 0);
    const freqOptFactor = 1.12 + (hasBlockingAssignment ? 0.04 : 0) + (hasWidthMismatch ? 0.02 : 0);
    const areaOptFactor = 0.85 - (hasMissingDefault ? 0.03 : 0);
    
    // Calculate optimized metrics (with improvements)
    const powerAfter = Math.round(powerBefore * powerOptFactor * 10) / 10;
    const frequencyAfter = Math.round(frequencyBefore * freqOptFactor * 10) / 10;
    const areaAfter = Math.round(areaBefore * areaOptFactor * 10) / 10;
    
    // Calculate improvement percentages
    const powerImprovement = Math.round((1 - powerAfter / powerBefore) * 100);
    const frequencyImprovement = Math.round((frequencyAfter / frequencyBefore - 1) * 100);
    const areaImprovement = Math.round((1 - areaAfter / areaBefore) * 100);
    
    // 芯片利用率
    const chipUtilization = Math.round((60 + Math.random() * 20) * 10) / 10;
    
    // Generate Pareto points
    const paretoPoints: ParetoPoint[] = generateParetoPoints(
      powerBefore,
      powerAfter,
      frequencyBefore,
      frequencyAfter,
      areaBefore,
      areaAfter
    );
    
    // Simulate a 10-second optimization process with progress updates
    let progress = 0;
    
    // 模拟优化过程中的不同阶段
    const simulateOptimizationPhases = () => {
      const phases = [
        { progress: 10, message: "正在分析代码结构..." },
        { progress: 20, message: "识别可优化模块..." },
        { progress: 30, message: "正在应用时序优化..." },
        { progress: 45, message: "正在应用功耗优化..." },
        { progress: 60, message: "正在应用面积优化..." },
        { progress: 70, message: "生成优化后RTL..." },
        { progress: 80, message: "正在综合设计..." },
        { progress: 90, message: "评估性能指标..." },
        { progress: 100, message: "优化完成！" }
      ];
      
      let phaseIndex = 0;
      
      const phaseInterval = setInterval(() => {
        if (phaseIndex >= phases.length) {
          clearInterval(phaseInterval);
          
          resolve({
            powerBefore,
            powerAfter,
            frequencyBefore,
            frequencyAfter,
            powerImprovement,
            frequencyImprovement,
            areaBefore,
            areaAfter,
            areaImprovement,
            chipUtilization,
            optimizationTechniques,
            chipLayoutUrl: '/src/assets/wave.png', // 实际项目中应该替换为真实的芯片布局图
            paretoPoints
          });
          
          return;
        }
        
        const phase = phases[phaseIndex];
        progress = phase.progress;
        onProgress(progress);
        console.log(phase.message);
        
        phaseIndex++;
      }, 1000);
    };
    
    simulateOptimizationPhases();
  });
};

/**
 * Generates a set of Pareto points for power vs frequency optimization
 * 
 * @param powerBefore - Power consumption before optimization
 * @param powerAfter - Power consumption after optimization
 * @param frequencyBefore - Frequency before optimization
 * @param frequencyAfter - Frequency after optimization
 * @param areaBefore - Area before optimization
 * @param areaAfter - Area after optimization
 * @returns Array of Pareto points
 */
const generateParetoPoints = (
  powerBefore: number,
  powerAfter: number,
  frequencyBefore: number,
  frequencyAfter: number,
  areaBefore: number,
  areaAfter: number
): ParetoPoint[] => {
  const points: ParetoPoint[] = [];
  
  // Add the original design point
  points.push({
    power: powerBefore,
    frequency: frequencyBefore,
    area: areaBefore,
    label: '原始设计'
  });
  
  // Add the optimized design point
  points.push({
    power: powerAfter,
    frequency: frequencyAfter,
    area: areaAfter,
    label: '优化设计'
  });
  
  // Generate a few intermediate points to form a Pareto curve
  const numPoints = 5;
  for (let i = 0; i < numPoints; i++) {
    // Create points that form a curve between original and optimized
    const ratio = (i + 1) / (numPoints + 1);
    const powerVariation = (Math.random() * 0.1 - 0.05) * powerBefore;
    const freqVariation = (Math.random() * 0.1 - 0.05) * frequencyBefore;
    const areaVariation = (Math.random() * 0.1 - 0.05) * areaBefore;
    
    points.push({
      power: powerBefore - ratio * (powerBefore - powerAfter) + powerVariation,
      frequency: frequencyBefore + ratio * (frequencyAfter - frequencyBefore) + freqVariation,
      area: areaBefore - ratio * (areaBefore - areaAfter) + areaVariation,
      label: `方案 ${i + 1}`
    });
  }
  
  return points;
}; 