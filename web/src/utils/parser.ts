import { Node, Edge } from './types';

/**
 * Mock parser that converts Verilog code to a circuit graph
 * This will be replaced with a real parser in the future
 *
 * @param code - Verilog code to parse
 * @returns Graph representation with nodes and edges
 */
export const parseVerilog = (
  code: string
): { nodes: Node[]; edges: Edge[] } => {
  // If code is empty, return empty graph
  if (!code.trim()) {
    return { nodes: [], edges: [] };
  }

  // Create a mapping from line numbers to potential nodes
  const lineToNode = new Map<number, string>();
  
  // Analyze code to extract potential module structure
  const lines = code.split('\n');
  const nodeIds: string[] = [];
  
  // Simple regex pattern matching for different types of Verilog constructs
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Very simplified regex patterns
    if (line.match(/\s*input\s+(\w+)/)) {
      const matches = line.match(/\s*input\s+(\w+)/);
      const portName = matches ? matches[1] : `in_${index}`;
      const id = `input_${portName}`;
      lineToNode.set(lineNumber, id);
      nodeIds.push(id);
    } else if (line.match(/\s*output\s+(\w+)/)) {
      const matches = line.match(/\s*output\s+(\w+)/);
      const portName = matches ? matches[1] : `out_${index}`;
      const id = `output_${portName}`;
      lineToNode.set(lineNumber, id);
      nodeIds.push(id);
    } else if (line.match(/\s*reg\s+(\w+)/)) {
      const matches = line.match(/\s*reg\s+(\w+)/);
      const regName = matches ? matches[1] : `reg_${index}`;
      const id = `reg_${regName}`;
      lineToNode.set(lineNumber, id);
      nodeIds.push(id);
    } else if (line.match(/\s*wire\s+(\w+)/)) {
      const matches = line.match(/\s*wire\s+(\w+)/);
      const wireName = matches ? matches[1] : `wire_${index}`;
      const id = `wire_${wireName}`;
      lineToNode.set(lineNumber, id);
      nodeIds.push(id);
    } else if (line.match(/\s*module\s+(\w+)/)) {
      const matches = line.match(/\s*module\s+(\w+)/);
      const moduleName = matches ? matches[1] : 'unknown';
      const id = `module_${moduleName}`;
      lineToNode.set(lineNumber, id);
      nodeIds.push(id);
    } else if (line.match(/\s*assign\s+(\w+)/)) {
      const matches = line.match(/\s*assign\s+(\w+)/);
      const assignName = matches ? matches[1] : `assign_${index}`;
      const id = `assign_${assignName}`;
      lineToNode.set(lineNumber, id);
      nodeIds.push(id);
    } else if (line.match(/\s*always\s+/)) {
      // For 'always' blocks, use a unique ID but give it a meaningful name
      const id = `always_block_${index}`;
      lineToNode.set(lineNumber, id);
      nodeIds.push(id);
    }
  });

  // Generate a reasonable number of nodes based on the code
  const numberOfNodes = Math.min(
    Math.max(8, nodeIds.length),
    15
  );

  // Create nodes
  const nodes: Node[] = [];
  
  // Use identified nodes from the code if available
  for (let i = 0; i < Math.min(numberOfNodes, nodeIds.length); i++) {
    const id = nodeIds[i];
    const lineNumber = [...lineToNode.entries()]
      .find(entry => entry[1] === id)?.[0] || i + 1;
    
    // Extract a clean label from the ID
    let label = id.split('_').slice(1).join('_');
    
    // Determine node type from the id
    let type: Node['type'] = 'combinational';
    if (id.startsWith('input_')) type = 'input';
    else if (id.startsWith('output_')) type = 'output';
    else if (id.startsWith('reg_')) type = 'register';
    else if (id.startsWith('module_')) type = 'module';
    
    nodes.push({
      id,
      label: label || `Node ${i + 1}`,
      type,
      line: lineNumber,
    });
  }
  
  // If we need more nodes, generate random ones with more structured placement
  for (let i = nodeIds.length; i < numberOfNodes; i++) {
    // Ensure we have a good mix of different node types
    let type: Node['type'];
    const typeIndex = i % 4; // Cycle through types
    
    if (typeIndex === 0) type = 'input';
    else if (typeIndex === 1) type = 'output';
    else if (typeIndex === 2) type = 'register';
    else type = 'combinational';
    
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    const id = `${type}_${typeName}_${i - nodeIds.length + 1}`;
    
    nodes.push({
      id,
      label: `${typeName} ${i - nodeIds.length + 1}`,
      type,
      line: Math.floor(Math.random() * lines.length) + 1,
    });
  }

  // Create edges to connect nodes in a structured way
  const edges: Edge[] = [];
  
  // Group nodes by type
  const inputNodes = nodes.filter(n => n.type === 'input');
  const regNodes = nodes.filter(n => n.type === 'register');
  const combNodes = nodes.filter(n => n.type === 'combinational');
  const outputNodes = nodes.filter(n => n.type === 'output');
  
  // Create more structured connections
  
  // Connect inputs to registers first, then to combinational logic
  inputNodes.forEach((input, idx) => {
    // Connect inputs to registers with priority
    if (regNodes.length > 0) {
      // Try to connect to a specific register based on index to avoid all inputs going to the same register
      const targetRegIdx = idx % regNodes.length;
      edges.push({
        id: `e_${input.id}_${regNodes[targetRegIdx].id}`,
        source: input.id,
        target: regNodes[targetRegIdx].id,
      });
    }
    
    // Connect inputs to some combinational nodes
    if (combNodes.length > 0) {
      // Connect each input to 1-2 combinational nodes in sequence to avoid clumping
      const targetCount = Math.min(2, combNodes.length);
      for (let i = 0; i < targetCount; i++) {
        const targetIdx = (idx + i) % combNodes.length;
        edges.push({
          id: `e_${input.id}_${combNodes[targetIdx].id}`,
          source: input.id,
          target: combNodes[targetIdx].id,
        });
      }
    }
  });
  
  // Connect registers to combinational logic and outputs
  regNodes.forEach((reg, idx) => {
    // Connect to combinational logic
    if (combNodes.length > 0) {
      const targetIdx = idx % combNodes.length;
      edges.push({
        id: `e_${reg.id}_${combNodes[targetIdx].id}`,
        source: reg.id,
        target: combNodes[targetIdx].id,
      });
    }
    
    // Connect directly to outputs if appropriate
    if (outputNodes.length > 0 && idx < outputNodes.length) {
      edges.push({
        id: `e_${reg.id}_${outputNodes[idx].id}`,
        source: reg.id,
        target: outputNodes[idx].id,
      });
    }
  });
  
  // Connect combinational logic to outputs
  combNodes.forEach((comb, idx) => {
    if (outputNodes.length > 0) {
      // Each combinational node connects to a specific output
      const targetIdx = idx % outputNodes.length;
      edges.push({
        id: `e_${comb.id}_${outputNodes[targetIdx].id}`,
        source: comb.id,
        target: outputNodes[targetIdx].id,
      });
    }
  });
  
  // Ensure all outputs have at least one input
  outputNodes.forEach((output, idx) => {
    if (!edges.some(e => e.target === output.id)) {
      // If no connection exists, create one from a register or combinational node
      const possibleSources = [...regNodes, ...combNodes];
      if (possibleSources.length > 0) {
        const sourceIdx = idx % possibleSources.length;
        edges.push({
          id: `e_${possibleSources[sourceIdx].id}_${output.id}`,
          source: possibleSources[sourceIdx].id,
          target: output.id,
        });
      }
    }
  });

  return { nodes, edges };
};

/**
 * Maps a line number to a node in the graph
 * 
 * @param lineNumber - Line number in the code
 * @param nodes - List of nodes in the graph
 * @returns The node corresponding to the line number or null if not found
 */
export const findNodeByLine = (lineNumber: number, nodes: Node[]): Node | null => {
  return nodes.find(node => node.line === lineNumber) || null;
};

/**
 * Maps a node ID to its line number in the code
 * 
 * @param nodeId - ID of the node
 * @param nodes - List of nodes in the graph
 * @returns The line number corresponding to the node or null if not found
 */
export const findLineByNodeId = (nodeId: string, nodes: Node[]): number | null => {
  const node = nodes.find(n => n.id === nodeId);
  return node ? node.line : null;
}; 