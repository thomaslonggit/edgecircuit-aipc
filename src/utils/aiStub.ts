import { Node, NodeExplanation, LintError } from './types';

/**
 * Mock AI analysis function that identifies potential bugs in the circuit
 * This will be replaced with a real AI module in the future
 * 
 * @param nodes - List of nodes to analyze
 * @returns List of explanations for problematic nodes
 */
export const analyzeWithAI = (nodes: Node[]): NodeExplanation[] => {
  // 如果没有节点，返回空数组
  if (nodes.length === 0) {
    return [];
  }
  
  // 如果只分析一个节点（从错误列表点击），创建针对性的解释
  if (nodes.length === 1) {
    const node = nodes[0];
    return [generateExplanationForNode(node)];
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
  bugNodes.forEach(node => {
    node.isBug = true;
    
    // 为每个bug节点创建解释
    const explanation = generateExplanationForNode(node);
    explanations.push(explanation);
  });
  
  return explanations;
};

/**
 * 为特定节点生成针对性的解释
 * 根据节点行号确定是哪个特定错误
 */
const generateExplanationForNode = (node: Node): NodeExplanation => {
  // 根据行号确定错误类型
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
  end`
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
  if (tx_valid) begin`
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
  end`
    };
  }
  
  // 如果没有匹配的特定错误，生成通用解释
  return generateExplanation(node);
};

/**
 * 生成一个通用的解释（用于非特定错误的节点）
 * 
 * @param node - 要生成解释的节点
 * @returns 该节点的解释对象
 */
const generateExplanation = (node: Node): NodeExplanation => {
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
    fixedCode
  };
}; 