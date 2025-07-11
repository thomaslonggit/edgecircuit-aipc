import { LintError } from './types';
import { checkCodeWithTinyBERT, getTinyBertStatus } from './modelService';

/**
 * 语法检查函数 - 现在使用真实的TinyBERT模型
 * 如果TinyBERT不可用，会fallback到本地基础检查
 * 
 * @param code - Verilog code to lint
 * @returns Array of lint errors
 */
export const lintCode = async (code: string): Promise<LintError[]> => {
  // 首先尝试使用TinyBERT进行检查
  try {
    const tinyBertErrors = await checkCodeWithTinyBERT(code);
    
    // 如果TinyBERT返回了结果，使用它
    if (tinyBertErrors.length > 0 || getTinyBertStatus().isConnected) {
      return tinyBertErrors;
    }
  } catch (error) {
    console.warn('TinyBERT unavailable, falling back to local checks:', error);
  }

  // Fallback: 基础的本地语法检查（保持原有的逻辑作为备份）
  return getBasicLintErrors(code);
};

/**
 * 基础的本地语法检查（作为TinyBERT的fallback）
 * 保留原有的错误检测逻辑
 */
function getBasicLintErrors(code: string): LintError[] {
  const errors: LintError[] = [];
  
  if (!code.trim()) {
    return errors;
  }

  const lines = code.split('\n');
  
  // 检查一些基本的Verilog语法问题
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // 检查阻塞赋值在always块中的使用
    if (trimmedLine.includes('=') && !trimmedLine.includes('<=') && 
        !trimmedLine.includes('==') && !trimmedLine.includes('!=') &&
        !trimmedLine.startsWith('//') && !trimmedLine.startsWith('*')) {
      
      // 检查这行是否在always块内（简单检测）
      let inAlwaysBlock = false;
      for (let i = Math.max(0, index - 10); i < index; i++) {
        if (lines[i]?.includes('always')) {
          inAlwaysBlock = true;
          break;
        }
      }
      
      if (inAlwaysBlock) {
        errors.push({
          line: lineNumber,
          message: '在时序逻辑中检测到阻塞赋值(=)，建议使用非阻塞赋值(<=)',
          severity: 'error',
          code: 'E001'
        });
      }
    }
    
    // 检查信号宽度不匹配
    if (trimmedLine.includes("== 8'b1") || trimmedLine.includes("== 8'h1")) {
      errors.push({
        line: lineNumber,
        message: '可能的信号宽度不匹配：单bit信号与8位值比较',
        severity: 'error',
        code: 'E002'
      });
    }
    
    // 检查case语句
    if (trimmedLine.includes('case') && !trimmedLine.includes('endcase')) {
      // 查找对应的endcase，检查是否有default
      let hasDefault = false;
      let endcaseFound = false;
      
      for (let i = index + 1; i < lines.length && i < index + 20; i++) {
        const nextLine = lines[i]?.trim();
        if (nextLine?.includes('default')) {
          hasDefault = true;
        }
        if (nextLine?.includes('endcase')) {
          endcaseFound = true;
          break;
        }
      }
      
      if (endcaseFound && !hasDefault) {
        errors.push({
          line: lineNumber,
          message: 'case语句缺少default分支，可能导致锁存器生成',
          severity: 'warning',
          code: 'W001'
        });
      }
    }
  });
  
  return errors;
}

// 为了保持向后兼容性，导出同步版本（用于现有代码）
export const lintCodeSync = (code: string): LintError[] => {
  return getBasicLintErrors(code);
}; 