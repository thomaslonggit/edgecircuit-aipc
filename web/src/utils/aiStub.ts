import { Node, NodeExplanation, LintError } from './types';
import { analyzeCodeWithLLM, getLLMStatus } from './modelService';

/**
 * AI分析函数 - 现在使用真实的LLM模型
 * 如果LLM不可用，会fallback到本地预定义解释
 * 
 * @param nodes - List of nodes to analyze
 * @returns List of explanations for problematic nodes
 */
export const analyzeWithAI = async (nodes: Node[]): Promise<NodeExplanation[]> => {
  // 如果没有节点，返回空数组
  if (nodes.length === 0) {
    return [];
  }
  
  // 如果只分析一个节点（从错误列表点击），创建针对性的解释
  if (nodes.length === 1) {
    const node = nodes[0];
    return [await generateExplanationForNode(node)];
  }
  
  // 一般分析 - 选择随机节点作为"问题点"
  const explanations: NodeExplanation[] = [];
  
  // 选取最多2个节点标记为问题点
  const numBugs = Math.min(2, nodes.length);
  
  // 复制节点数组以避免修改原始数组
  const nodesCopy = [...nodes];
  
  // 随机排序节点并选择前numBugs个
  const bugNodes = nodesCopy
    .sort(() => Math.random() - 0.5)
    .slice(0, numBugs);
  
  // 标记选中的节点为bug
  for (const node of bugNodes) {
    node.isBug = true;
    
    // 为每个bug节点创建解释
    const explanation = await generateExplanationForNode(node);
    explanations.push(explanation);
  }
  
  return explanations;
};

/**
 * 为特定节点生成针对性的解释
 * 优先使用LLM，如果不可用则使用预定义解释
 */
const generateExplanationForNode = async (node: Node): Promise<NodeExplanation> => {
  // 尝试使用LLM进行分析
  try {
    if (getLLMStatus().isConnected) {
      const prompt = createAnalysisPrompt(node);
      const llmResponse = await analyzeCodeWithLLM(prompt);
      
      // 解析LLM返回的内容
      const parsedResponse = parseLLMResponse(llmResponse, node);
      return {
        nodeId: node.id,
        explanation: parsedResponse.explanation,
        fixDescription: parsedResponse.fixDescription,
        originalCode: parsedResponse.originalCode,
        fixedCode: parsedResponse.fixedCode,
        lineNumber: node.line
      };
    }
  } catch (error) {
    console.warn('LLM analysis failed, using fallback:', error);
  }

  // Fallback到预定义解释
  return generatePredefinedExplanation(node);
};

/**
 * 创建LLM分析提示词
 */
function createAnalysisPrompt(node: Node): string {
  const basePrompt = `我在Verilog代码的第 ${node.line} 行发现了一个问题，涉及到 "${node.label}" (类型: ${node.type})。`;
  
  let specificContext = '';
  
  // 根据节点行号提供更具体的上下文
  if (node.line >= 40 && node.line <= 44) {
    specificContext = `这个问题似乎与always块中的赋值语句有关。代码中可能使用了阻塞赋值(=)而不是非阻塞赋值(<=)。`;
  } else if (node.line >= 56 && node.line <= 58) {
    specificContext = `这个问题涉及信号宽度匹配。可能存在1位信号与8位值进行比较的情况。`;
  } else if (node.line >= 78 && node.line <= 79) {
    specificContext = `这个问题与case语句有关，可能缺少default分支。`;
  } else {
    specificContext = `这是一个${node.type}类型的硬件元素。`;
  }
  
  return `${basePrompt}

${specificContext}

请按照以下格式分析并回复：

## 问题分析
解释这个问题的根本原因和可能导致的后果。

## 修复方法
提供具体的修复步骤和最佳实践建议。

## 原始代码
\`\`\`verilog
[有问题的原始代码]
\`\`\`

## 修复后代码
\`\`\`verilog
[修复后的代码]
\`\`\`

请用中文回答，提供清晰的代码示例和详细的技术解释。`;
}

/**
 * 解析LLM返回的内容，提取不同的部分
 */
function parseLLMResponse(llmResponse: string, node: Node) {
  // 如果LLM返回内容为空或过短，使用fallback
  if (!llmResponse || llmResponse.length < 50) {
    return {
      explanation: 'AI分析暂时不可用，请稍后重试。',
      fixDescription: '基于AI分析的修复建议',
      originalCode: `// 第 ${node.line} 行: ${node.label}`,
      fixedCode: '// 请稍后重试获取修复建议'
    };
  }

  // 尝试从LLM回复中提取不同部分
  let explanation = '';
  let fixDescription = '基于AI分析的修复建议';
  let originalCode = `// 第 ${node.line} 行: ${node.label}`;
  let fixedCode = '';

  // 分析LLM回复的结构
  const sections = llmResponse.split(/\n\s*\n/); // 按空行分段
  
  // 查找代码块（用反引号包围的部分）
  const codeBlockPattern = /```(?:verilog|systemverilog)?\s*\n?([\s\S]*?)\n?```/gi;
  const codeBlocks = [];
  let match;
  while ((match = codeBlockPattern.exec(llmResponse)) !== null) {
    codeBlocks.push(match[1].trim());
  }

  // 如果找到代码块，使用第一个作为原始代码，第二个作为修复代码
  if (codeBlocks.length >= 1) {
    if (codeBlocks.length === 1) {
      // 只有一个代码块，假设是修复后的代码
      fixedCode = codeBlocks[0];
    } else if (codeBlocks.length >= 2) {
      // 有两个或更多代码块，第一个是原始代码，第二个是修复代码
      originalCode = codeBlocks[0];
      fixedCode = codeBlocks[1];
    }
  }

  // 如果没有找到修复代码，从文本中提取
  if (!fixedCode) {
    // 查找可能的修复建议
    const fixPatterns = [
      /修复[后代码]*[:：]\s*([^\n]+)/i,
      /应该[改为修改成]*[:：]\s*([^\n]+)/i,
      /建议[修改改为]*[:：]\s*([^\n]+)/i,
      /正确的?[写法代码]*[:：]\s*([^\n]+)/i
    ];
    
    for (const pattern of fixPatterns) {
      const fixMatch = llmResponse.match(pattern);
      if (fixMatch) {
        fixedCode = fixMatch[1].trim();
        break;
      }
    }
  }

  // 如果仍然没有修复代码，使用默认提示
  if (!fixedCode) {
    fixedCode = '// 请查看上方分析获取具体修复方法';
  }

  // 提取主要解释内容（去掉代码块后的文本）
  let cleanText = llmResponse.replace(codeBlockPattern, '[代码示例]');
  
  // 查找问题解释部分
  const explanationPatterns = [
    /问题[的分析]*[:：]\s*([\s\S]*?)(?=\n\s*[修复建议解决方案]|$)/i,
    /原因[:：]\s*([\s\S]*?)(?=\n\s*[修复建议解决方案]|$)/i,
    /这个问题([\s\S]*?)(?=\n\s*[修复建议解决方案]|$)/i
  ];

  for (const pattern of explanationPatterns) {
    const explanationMatch = cleanText.match(pattern);
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
      break;
    }
  }

  // 如果没有找到明确的解释，使用前几句作为解释
  if (!explanation) {
    const sentences = cleanText.split(/[。！？]/);
    explanation = sentences.slice(0, 3).join('。').trim();
    if (explanation && !explanation.endsWith('。')) {
      explanation += '。';
    }
  }

  // 如果解释仍然为空，使用整个回复的一部分
  if (!explanation) {
    explanation = cleanText.substring(0, 300) + (cleanText.length > 300 ? '...' : '');
  }

  // 查找修复描述
  const fixDescPatterns = [
    /修复方法[:：]\s*([^\n]+)/i,
    /解决方案[:：]\s*([^\n]+)/i,
    /建议[:：]\s*([^\n]+)/i
  ];

  for (const pattern of fixDescPatterns) {
    const descMatch = llmResponse.match(pattern);
    if (descMatch) {
      fixDescription = descMatch[1].trim();
      break;
    }
  }

  return {
    explanation: explanation || '基于AI的问题分析结果',
    fixDescription,
    originalCode,
    fixedCode
  };
}

/**
 * 生成预定义的解释（作为LLM的fallback）
 * 保留原有的解释逻辑
 */
function generatePredefinedExplanation(node: Node): NodeExplanation {
  // 根据节点行号确定错误类型（保留原有逻辑）
  if (node.line >= 40 && node.line <= 44) {
    // 错误1: 阻塞赋值错误
    return {
      nodeId: node.id,
      explanation: '在时序逻辑设计中，always块内的寄存器赋值应该使用非阻塞赋值(<=)而不是阻塞赋值(=)。阻塞赋值会导致时序问题和不可预测的行为。',
      fixDescription: '将阻塞赋值(=)替换为非阻塞赋值(<=)',
      originalCode: `  if (!rst_n) begin
    tx_state = IDLE;     // 错误：使用了阻塞赋值
    tx_counter = 0;
    tx_bit_index = 0;
    tx_out = 1'b1;
  end`,
      fixedCode: `  if (!rst_n) begin
    tx_state <= IDLE;    // 修复：使用非阻塞赋值
    tx_counter <= 0;
    tx_bit_index <= 0;
    tx_out <= 1'b1;
  end`,
      lineNumber: node.line
    };
  } else if (node.line >= 56 && node.line <= 58) {
    // 错误2: 信号宽度不匹配
    return {
      nodeId: node.id,
      explanation: '信号宽度不匹配可能导致意外行为。tx_valid是一个1位信号，但这里与8位值比较，这种比较不必要且容易引起混淆。',
      fixDescription: '修正信号比较，使用简单的条件检查',
      originalCode: `  // 错误：信号宽度不匹配
  if (tx_valid == 8'b1) begin`,
      fixedCode: `  // 修复：正确检查1位信号
  if (tx_valid) begin`,
      lineNumber: node.line
    };
  } else if (node.line >= 78 && node.line <= 79) {
    // 错误3: 缺少默认分支
    return {
      nodeId: node.id,
      explanation: 'case语句缺少default分支可能导致硬件中生成锁存器。在FPGA/ASIC设计中，这通常是不希望的，因为它会增加资源使用并可能导致不可预测的行为。',
      fixDescription: '添加default分支',
      originalCode: `  // 错误：缺少default分支
  // 可能导致锁存器生成`,
      fixedCode: `  default: begin
    tx_state <= IDLE;
  end`,
      lineNumber: node.line
    };
  }

  // 如果没有匹配特定错误，使用通用解释
  return generateGenericExplanation(node);
}

/**
 * 生成一个通用的解释（用于非特定错误的节点）
 * 保留原有逻辑
 */
const generateGenericExplanation = (node: Node): NodeExplanation => {
  // 基于节点类型的样本解释
  const explanations: Record<Node['type'], string[]> = {
    input: [
      '输入信号没有正确设置约束条件，可能导致电路时序问题。',
      '输入端口缺少上拉或下拉电阻，在某些情况下可能导致浮空输入。',
      'UART接收信号(rx)没有进行异步处理，可能导致亚稳态问题。'
    ],
    output: [
      '输出信号驱动能力可能不足，建议检查扇出负载。',
      '输出信号路径上存在潜在的竞争冒险，可能导致毛刺。',
      'UART发送信号(tx)在时钟域切换时可能需要额外的缓冲。'
    ],
    register: [
      '寄存器没有正确的复位逻辑，可能导致上电状态不确定。',
      '寄存器时钟域存在潜在的亚稳态风险，建议添加同步器。',
      '状态机寄存器应考虑使用独热编码(one-hot)而不是二进制编码，提高抗干扰能力。'
    ],
    combinational: [
      '组合逻辑存在冗余路径，可优化以减少面积。',
      '组合逻辑深度过大，可能导致时序违例，建议流水线化处理。',
      'UART波特率计算逻辑可以使用查找表优化，减少动态功耗。'
    ],
    module: [
      '模块接口定义不完整，缺少必要的控制信号。',
      '模块存在未使用的内部信号，可以优化以减少资源使用。',
      'UART控制器应添加奇偶校验功能，提高通信可靠性。'
    ]
  };
  
  // 基于节点类型的样本修复
  const fixes: Record<Node['type'], string[]> = {
    input: [
      '添加输入约束:\n\nset_input_delay -clock clk 2.0 [get_ports {%NODE%}]',
      '添加上拉电阻:\n\nwire %NODE%_i;\nassign %NODE%_i = %NODE% | 1\'b0;',
      '添加异步处理:\n\nreg %NODE%_meta, %NODE%_sync;\nalways @(posedge clk)\nbegin\n  %NODE%_meta <= %NODE%;\n  %NODE%_sync <= %NODE%_meta;\nend'
    ],
    output: [
      '增加输出缓冲:\n\nwire %NODE%_i;\nassign %NODE% = %NODE%_i;',
      '添加输出寄存:\n\nalways @(posedge clk)\n  %NODE% <= %NODE%_next;',
      '添加时钟域切换:\n\nreg [2:0] %NODE%_sync;\nalways @(posedge clk_out)\n  %NODE%_sync <= {%NODE%_sync[1:0], %NODE%_in};'
    ],
    register: [
      '添加复位逻辑:\n\nalways @(posedge clk or negedge rst_n)\n  if (!rst_n)\n    %NODE% <= 0;\n  else\n    %NODE% <= %NODE%_next;',
      '添加同步器:\n\nreg %NODE%_meta, %NODE%_sync;\nalways @(posedge clk)\n  begin\n    %NODE%_meta <= %NODE%_async;\n    %NODE%_sync <= %NODE%_meta;\n  end',
      '修改为独热编码:\n\nlocalparam IDLE = 4\'b0001;\nlocalparam START = 4\'b0010;\nlocalparam DATA = 4\'b0100;\nlocalparam STOP = 4\'b1000;'
    ],
    combinational: [
      '优化冗余路径:\n\nassign %NODE% = a & b; // 替代 (a & b) | (a & b & c)',
      '流水线化处理:\n\nreg stage1, stage2;\nalways @(posedge clk)\n  begin\n    stage1 <= %NODE%_part1;\n    stage2 <= stage1 & %NODE%_part2;\n    %NODE% <= stage2;\n  end',
      '使用查找表优化:\n\nreg [7:0] baud_lookup [0:3];\ninitial begin\n  baud_lookup[0] = 8\'d434; // 9600\n  baud_lookup[1] = 8\'d217; // 19200\n  baud_lookup[2] = 8\'d108; // 38400\n  baud_lookup[3] = 8\'d54;  // 76800\nend'
    ],
    module: [
      '完善接口定义:\n\nmodule %NODE% (\n  input clk,\n  input rst_n,\n  // ... existing code ...\n  input valid_in,\n  output ready_out\n);',
      '移除未使用信号:\n\n// wire unused_signal; // 已删除未使用的信号',
      '添加奇偶校验:\n\nreg parity_bit;\nalways @(posedge clk)\n  parity_bit <= ^tx_data; // 偶校验'
    ]
  };
  
  // 选择随机解释和修复方案
  const explanationIndex = Math.floor(Math.random() * explanations[node.type].length);
  const explanation = explanations[node.type][explanationIndex];
  const fix = fixes[node.type][explanationIndex];
  
  // 创建示例代码（原始和修复后）
  let originalCode = '';
  let fixedCode = '';
  
  if (node.type === 'input' || node.type === 'output') {
    originalCode = `// Line ${node.line}: 原始代码\ninput wire ${node.label};\n// 缺少适当的约束或处理`;
    fixedCode = fix.replace(/%NODE%/g, node.label);
  } else if (node.type === 'register') {
    originalCode = `// Line ${node.line}: 原始代码\nreg [7:0] ${node.label};\nalways @(posedge clk)\n  ${node.label} <= next_value;`;
    fixedCode = fix.replace(/%NODE%/g, node.label);
  } else if (node.type === 'combinational') {
    originalCode = `// Line ${node.line}: 原始代码\nassign ${node.label} = a & b & c | a & b & ~c;`;
    fixedCode = fix.replace(/%NODE%/g, node.label);
  } else if (node.type === 'module') {
    originalCode = `// Line ${node.line}: 原始代码\nmodule ${node.label}(\n  input clk,\n  input rst_n\n  // 缺少其他必要接口\n);`;
    fixedCode = fix.replace(/%NODE%/g, node.label);
  }
  
  return {
    nodeId: node.id,
    explanation,
    fixDescription: '建议修复方法:',
    originalCode,
    fixedCode,
    lineNumber: node.line
  };
};

// 为了保持向后兼容性，导出同步版本（用于现有代码）
export const analyzeWithAISync = (nodes: Node[]): NodeExplanation[] => {
  if (nodes.length === 0) {
    return [];
  }
  
  if (nodes.length === 1) {
    return [generatePredefinedExplanation(nodes[0])];
  }
  
  const explanations: NodeExplanation[] = [];
  const numBugs = Math.min(2, nodes.length);
  const nodesCopy = [...nodes];
  const bugNodes = nodesCopy
    .sort(() => Math.random() - 0.5)
    .slice(0, numBugs);
  
  bugNodes.forEach(node => {
    node.isBug = true;
    const explanation = generatePredefinedExplanation(node);
    explanations.push(explanation);
  });
  
  return explanations;
};

/**
 * 智能应用代码修复 - 只替换有问题的代码行，而不是整个文件
 * @param currentCode 当前编辑器中的完整代码
 * @param explanation 包含修复信息的解释对象
 * @returns 修复后的完整代码
 */
export const applyCodeFix = (currentCode: string, explanation: NodeExplanation): string => {
  // 如果没有行号信息，无法进行智能替换，返回原代码
  if (!explanation.lineNumber) {
    console.warn('无法应用修复：缺少行号信息');
    return currentCode;
  }

  const lines = currentCode.split('\n');
  const targetLineIndex = explanation.lineNumber - 1; // 转换为0基础索引

  // 检查行号是否有效
  if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
    console.warn(`无法应用修复：行号 ${explanation.lineNumber} 超出范围`);
    return currentCode;
  }

  // 尝试智能匹配和替换
  const fixedCodeLines = explanation.fixedCode.split('\n');
  const originalCodeLines = explanation.originalCode.split('\n');

  // 如果修复代码是单行，直接替换目标行
  if (fixedCodeLines.length === 1) {
    lines[targetLineIndex] = fixedCodeLines[0];
    return lines.join('\n');
  }

  // 如果修复代码是多行，需要更智能的处理
  // 首先尝试找到原始代码块在当前代码中的位置
  let startIndex = targetLineIndex;
  let endIndex = targetLineIndex;

  // 尝试匹配原始代码块
  if (originalCodeLines.length > 1) {
    // 去除注释行和空行，寻找实际代码内容
    const meaningfulOriginalLines = originalCodeLines.filter(line => 
      !line.trim().startsWith('//') && line.trim().length > 0
    );
    const meaningfulFixedLines = fixedCodeLines.filter(line => 
      !line.trim().startsWith('//') && line.trim().length > 0
    );

    if (meaningfulOriginalLines.length > 0 && meaningfulFixedLines.length > 0) {
      // 寻找匹配的代码块
      for (let i = Math.max(0, targetLineIndex - 5); i <= Math.min(lines.length - meaningfulOriginalLines.length, targetLineIndex + 5); i++) {
        let match = true;
        for (let j = 0; j < meaningfulOriginalLines.length; j++) {
          if (i + j >= lines.length) {
            match = false;
            break;
          }
          // 简单的相似度匹配（去除空白字符差异）
          const currentLineNormalized = lines[i + j].replace(/\s+/g, ' ').trim();
          const originalLineNormalized = meaningfulOriginalLines[j].replace(/\s+/g, ' ').trim();
          if (!currentLineNormalized.includes(originalLineNormalized) && 
              !originalLineNormalized.includes(currentLineNormalized)) {
            match = false;
            break;
          }
        }
        if (match) {
          startIndex = i;
          endIndex = i + meaningfulOriginalLines.length - 1;
          break;
        }
      }
    }
  }

  // 应用修复
  const beforeLines = lines.slice(0, startIndex);
  const afterLines = lines.slice(endIndex + 1);
  
  // 保持缩进
  const targetIndent = lines[startIndex].match(/^\s*/)?.[0] || '';
  const indentedFixedLines = fixedCodeLines.map((line, index) => {
    if (index === 0 || line.trim().length === 0) {
      return line;
    }
    // 为非首行添加适当的缩进
    return targetIndent + line.replace(/^\s*/, '');
  });

  return [...beforeLines, ...indentedFixedLines, ...afterLines].join('\n');
}; 