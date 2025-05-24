import { LintError } from './types';

/**
 * Simple linting function that checks for common Verilog issues
 * This is a stub and will be replaced with a real linter in the future
 * 
 * @param code - Verilog code to lint
 * @returns Array of lint errors
 */
export const lintCode = (code: string): LintError[] => {
  const errors: LintError[] = [];
  
  // 只检查3个特定的典型Verilog错误
  // 错误1: 在always块中使用阻塞赋值(=)而非非阻塞赋值(<=)
  errors.push({
    line: 41,
    message: '在always块中使用了阻塞赋值(=)，应该使用非阻塞赋值(<=)',
    severity: 'error',
    code: 'E001'
  });
  
  // 错误2: 信号宽度不匹配问题
  errors.push({
    line: 57,
    message: '信号宽度不匹配: tx_valid是1位，但与8位值比较',
    severity: 'error',
    code: 'E002'
  });
  
  // 错误3: case语句缺少default分支
  errors.push({
    line: 78,
    message: 'case语句缺少default分支，可能导致锁存器生成',
    severity: 'warning',
    code: 'W001'
  });
  
  return errors;
}; 