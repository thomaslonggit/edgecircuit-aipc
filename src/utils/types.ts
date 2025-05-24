/**
 * Represents a node in the circuit graph
 */
export interface Node {
  id: string;
  label: string;
  type: 'input' | 'output' | 'register' | 'combinational' | 'module';
  line: number;
  isBug?: boolean;
}

/**
 * Represents an edge in the circuit graph
 */
export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

/**
 * Represents a linting error in the code
 */
export interface LintError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;        // 错误代码，如E001, W002等
  category?: ErrorCategory; // 错误类别
  suggestion?: string;  // 简短修复建议
}

/**
 * 错误分类枚举
 */
export type ErrorCategory = 
  | 'syntax'        // 语法错误
  | 'timing'        // 时序相关
  | 'bitwidth'      // 位宽不匹配
  | 'range'         // 范围错误
  | 'style'         // 代码风格
  | 'optimization'  // 优化建议
  | 'simulation'    // 仿真问题
  | 'synthesis'     // 综合问题
  | 'other';        // 其他错误

/**
 * Explanation and suggested fix for a bug node
 */
export interface NodeExplanation {
  nodeId: string;
  explanation: string;
  fixDescription: string;
  originalCode: string;
  fixedCode: string;
  impact?: string;          // 问题的影响描述
  relatedConcepts?: string[]; // 相关的硬件设计概念
  difficultyLevel?: 'easy' | 'medium' | 'hard'; // 修复难度
}

/**
 * Simulation results from local simulation
 */
export interface SimulationResult {
  power: number;
  frequency: number;
  waveformUrl: string;
  timing?: {               // 时序信息
    maxDelay: number;      // 最大延迟路径
    setupViolations: number; // 建立时间违例数
    holdViolations: number;  // 保持时间违例数
  };
}

/**
 * Optimization results from cloud optimization
 */
export interface OptimizationResult {
  powerBefore: number;
  powerAfter: number;
  frequencyBefore: number;
  frequencyAfter: number;
  powerImprovement: number;
  frequencyImprovement: number;
  areaBefore?: number;     // 优化前面积
  areaAfter?: number;      // 优化后面积
  areaImprovement?: number;// 面积改进百分比
  chipUtilization?: number; // 芯片利用率
  optimizationTechniques?: string[]; // 应用的优化技术列表
  chipLayoutUrl?: string;  // 芯片布局图URL
  paretoPoints: ParetoPoint[];
}

/**
 * A point in the Pareto chart (power vs frequency)
 */
export interface ParetoPoint {
  power: number;
  frequency: number;
  area?: number;           // 面积
  label: string;
} 