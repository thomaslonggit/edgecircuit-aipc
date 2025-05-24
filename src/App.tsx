import { useState, useEffect, createContext } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Grid, 
  Paper, 
  ThemeProvider, 
  PaletteMode,
  Chip
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import PsychologyIcon from '@mui/icons-material/Psychology';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import { createAppTheme, getSavedThemePreference, saveThemePreference } from './theme';
import EditorPane from './components/EditorPane';
import GraphPane from './components/GraphPane';
import ErrorList from './components/ErrorList';
import ActionBar from './components/ActionBar';
import ExplainDrawer from './components/ExplainDrawer';
import IntelArchBanner from './components/IntelArchBanner';
import IntelLoadingIndicator from './components/IntelLoadingIndicator';
import LocalModelStatus from './components/LocalModelStatus';
import { Node, Edge, LintError, NodeExplanation } from './utils/types';
import { parseVerilog } from './utils/parser';
import { lintCode } from './utils/lintStub';
import { analyzeWithAI } from './utils/aiStub';

// Sample Verilog code
const SAMPLE_VERILOG_CODE = `module uart_controller(
  input wire clk,              // 系统时钟
  input wire rst_n,            // 低电平有效复位
  input wire rx,               // 接收数据线
  output wire tx,              // 发送数据线
  input wire [7:0] tx_data,    // 要发送的数据
  input wire tx_valid,         // 发送数据有效
  output wire tx_ready,        // 发送器就绪
  output wire [7:0] rx_data,   // 接收到的数据
  output wire rx_valid,        // 接收数据有效
  input wire rx_ready          // 接收器就绪
);

  // 内部参数定义
  parameter CLK_FREQ = 50000000;   // 50MHz时钟
  parameter BAUD_RATE = 115200;    // 波特率
  parameter CLKS_PER_BIT = CLK_FREQ / BAUD_RATE;  // 每位占用的时钟周期数

  // 状态机状态定义
  localparam IDLE = 2'b00;
  localparam START = 2'b01;
  localparam DATA = 2'b10;
  localparam STOP = 2'b11;

  // 内部信号定义
  reg [1:0] tx_state;      // 发送状态机
  reg [1:0] rx_state;      // 接收状态机
  reg [15:0] tx_counter;   // 发送计数器
  reg [15:0] rx_counter;   // 接收计数器
  reg [2:0] tx_bit_index;  // 发送位索引
  reg [2:0] rx_bit_index;  // 接收位索引
  reg [7:0] tx_buffer;     // 发送缓冲
  reg [7:0] rx_buffer;     // 接收缓冲
  reg tx_out;              // 输出寄存器
  reg rx_done;             // 接收完成标志
  wire transmitting;       // 正在发送标志 - 未使用的信号

  // 错误1: 寄存器赋值错误 - 在always块中使用阻塞赋值
  always @(posedge clk) begin
    if (!rst_n) begin
      tx_state = IDLE;     // 应该使用非阻塞赋值 <=
      tx_counter = 0;      // 应该使用非阻塞赋值 <=
      tx_bit_index = 0;    // 应该使用非阻塞赋值 <=
      tx_out = 1'b1;       // 应该使用非阻塞赋值 <=
    end else begin
      case (tx_state)
        IDLE: begin
          tx_out <= 1'b1;  // 空闲时发送线保持高电平
          tx_counter <= 0;
          tx_bit_index <= 0;
          
          // 错误2: 信号宽度不匹配 - tx_valid是1位，但与8位值比较
          if (tx_valid == 8'b1) begin  // 应该是 if (tx_valid)
            tx_buffer <= tx_data;
            tx_state <= START;
          end
        end
        
        START: begin
          tx_out <= 1'b0;  // 起始位为低电平
          // 计数器达到一个波特周期
          if (tx_counter < CLKS_PER_BIT - 1) begin
            tx_counter <= tx_counter + 1;
          end else begin
            tx_counter <= 0;
            tx_state <= DATA;
          end
        end
        
        DATA: begin
          tx_out <= tx_buffer[tx_bit_index];
          // 计数器达到一个波特周期
          if (tx_counter < CLKS_PER_BIT - 1) begin
            tx_counter <= tx_counter + 1;
          end else begin
            tx_counter <= 0;
            if (tx_bit_index < 7) begin
              tx_bit_index <= tx_bit_index + 1;
            end else begin
              tx_bit_index <= 0;
              tx_state <= STOP;
            end
          end
        end
        
        STOP: begin
          tx_out <= 1'b1;  // 停止位为高电平
          if (tx_counter < CLKS_PER_BIT - 1) begin
            tx_counter <= tx_counter + 1;
          end else begin
            tx_counter <= 0;
            tx_state <= IDLE;
          end
        end
        
        // 错误3: 缺少默认分支，可能导致锁存器生成
        // 应该添加 default 分支
      endcase
    end
  end

  // 接收状态机
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      rx_state <= IDLE;
      rx_counter <= 0;
      rx_bit_index <= 0;
      rx_buffer <= 8'h00;
      rx_done <= 1'b0;
    end else begin
      case (rx_state)
        IDLE: begin
          rx_done <= 1'b0;
          rx_counter <= 0;
          rx_bit_index <= 0;
          
          // 检测起始位（低电平）
          if (rx == 1'b0) begin
            rx_state <= START;
          end
        end
        
        START: begin
          // 在起始位中间采样，确认是否是有效的起始位
          if (rx_counter == CLKS_PER_BIT/2) begin
            if (rx == 1'b0) begin
              rx_counter <= rx_counter + 1;
            end else begin
              // 如果不是有效的起始位，返回空闲状态
              rx_state <= IDLE;
            end
          end else if (rx_counter < CLKS_PER_BIT - 1) begin
            rx_counter <= rx_counter + 1;
          end else begin
            rx_counter <= 0;
            rx_state <= DATA;
          end
        end
        
        DATA: begin
          // 在每一位的中间采样
          if (rx_counter == CLKS_PER_BIT/2) begin
            rx_buffer[rx_bit_index] <= rx;
          end
          
          if (rx_counter < CLKS_PER_BIT - 1) begin
            rx_counter <= rx_counter + 1;
          end else begin
            rx_counter <= 0;
            if (rx_bit_index < 7) begin
              rx_bit_index <= rx_bit_index + 1;
            end else begin
              rx_bit_index <= 0;
              rx_state <= STOP;
            end
          end
        end
        
        STOP: begin
          // 检查停止位是否为高电平
          if (rx_counter < CLKS_PER_BIT - 1) begin
            rx_counter <= rx_counter + 1;
          end else begin
            rx_done <= 1'b1;
            rx_counter <= 0;
            rx_state <= IDLE;
          end
        end
        
        default: begin
          rx_state <= IDLE;
        end
      endcase
    end
  end

  // 输出赋值
  assign tx = tx_out;
  assign tx_ready = (tx_state == IDLE);
  assign rx_valid = rx_done;
  assign rx_data = rx_buffer;

endmodule`;

// Create App Context for sharing state
interface AppContextType {
  code: string;
  setCode: (code: string) => void;
  graph: { nodes: Node[]; edges: Edge[] };
  lintErrors: LintError[];
  selectedNode: Node | null;
  nodeExplanation: NodeExplanation | null;
}

export const AppContext = createContext<AppContextType>({
  code: '',
  setCode: () => {},
  graph: { nodes: [], edges: [] },
  lintErrors: [],
  selectedNode: null,
  nodeExplanation: null
});

function App() {
  // Theme state
  const [mode, setMode] = useState<PaletteMode>(getSavedThemePreference());
  const theme = createAppTheme(mode);

  // Code and graph state
  const [code, setCode] = useState<string>(SAMPLE_VERILOG_CODE);
  const [graph, setGraph] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeExplanation, setNodeExplanation] = useState<NodeExplanation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  
  // 本地模型处理状态
  const [isLoadingTinyBERT, setIsLoadingTinyBERT] = useState<boolean>(false);
  const [isLoadingLLM, setIsLoadingLLM] = useState<boolean>(false);
  const [tinyBertLatency, setTinyBertLatency] = useState<number>(12); // 毫秒
  const [llmLatency, setLlmLatency] = useState<number>(950); // 毫秒

  // Toggle theme mode
  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    saveThemePreference(newMode);
  };

  // TinyBERT快速检测代码变化
  useEffect(() => {
    if (!code) return;

    const timer = setTimeout(() => {
      setIsLoadingTinyBERT(true);
      
      // 模拟TinyBERT处理延迟
      const startTime = performance.now();
      setTimeout(() => {
        const parsedGraph = parseVerilog(code);
        setGraph(parsedGraph);
        
        const errors = lintCode(code);
        setLintErrors(errors);
        
        // 计算实际延迟
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        setTinyBertLatency(Math.min(Math.max(latency, 10), 20)); // 确保在10-20ms范围内
        
        setIsLoadingTinyBERT(false);
      }, 15); // TinyBERT毫秒级处理
    }, 300); // 编辑后短暂延迟

    return () => clearTimeout(timer);
  }, [code]);

  // 初始化图表和错误检查
  useEffect(() => {
    if (code) {
      setIsLoadingTinyBERT(true);
      
      // 模拟初始TinyBERT处理
      setTimeout(() => {
        const parsedGraph = parseVerilog(code);
        setGraph(parsedGraph);
        
        const errors = lintCode(code);
        setLintErrors(errors);
        
        // 自动高亮第一个错误行
        if (errors.length > 0) {
          setHighlightedLine(errors[0].line);
          // 查找对应的节点
          const errorNode = parsedGraph.nodes.find(n => n.line === errors[0].line);
          if (errorNode) {
            setSelectedNode(errorNode);
          }
        }
        
        setIsLoadingTinyBERT(false);
      }, 15);
    }
  }, []);

  // 处理节点选择 - 触发LLM分析
  const handleNodeSelect = (node: Node) => {
    setSelectedNode(node);
    setHighlightedLine(node.line);
    
    // 查找相关错误
    const error = lintErrors.find(err => err.line === node.line);
    if (error) {
      handleRequestLLMAnalysis(error.code, node.line);
    }
  };

  // 处理行选择
  const handleLineSelect = (lineNumber: number) => {
    setHighlightedLine(lineNumber);
    
    // 查找相关节点和错误
    const node = graph.nodes.find(n => n.line === lineNumber);
    if (node) {
      setSelectedNode(node);
      
      // 如果这行有错误，不自动请求LLM分析，等用户点击"详细解释"按钮
      const error = lintErrors.find(err => err.line === lineNumber);
      if (error) {
        // 只设置选中状态，不自动请求LLM分析
      }
    }
  };
  
  // 请求LLM分析
  const handleRequestLLMAnalysis = (errorCode: string, lineNumber: number) => {
    setIsLoadingLLM(true);
    console.log(`请求LLM分析: 错误码=${errorCode}, 行号=${lineNumber}`);
    
    // 模拟LLM处理延迟
    const startTime = performance.now();
    setTimeout(() => {
      // 获取相关节点 - 首先尝试完全匹配行号
      let node = graph.nodes.find(n => n.line === lineNumber);
      
      // 如果没找到完全匹配的节点，尝试使用近似匹配（找最接近的行号）
      if (!node && graph.nodes.length > 0) {
        console.log(`未找到行号 ${lineNumber} 的精确匹配节点，尝试近似匹配...`);
        // 对节点按行号排序，找出最接近的
        const sortedNodes = [...graph.nodes].sort((a, b) => 
          Math.abs(a.line - lineNumber) - Math.abs(b.line - lineNumber)
        );
        node = sortedNodes[0];
        console.log(`找到最接近的节点, 行号: ${node.line}, 类型: ${node.type}, 标签: ${node.label}`);
      }
      
      // 为所找到的节点创建错误描述
      if (node) {
        console.log(`分析节点:`, node);
        try {
          // 手动设置找到的节点的行号为请求的行号，以确保错误解释针对正确的行
          const nodeWithCorrectLine = { ...node, line: lineNumber };
          console.log(`使用修正的行号创建节点:`, nodeWithCorrectLine);
          
          const explanation = analyzeWithAI([nodeWithCorrectLine])[0];
          console.log(`获取到分析结果:`, explanation);
          setNodeExplanation(explanation);
          setDrawerOpen(true);
        } catch (error) {
          console.error(`分析出错:`, error);
          // 出错时创建一个基本的解释
          const fallbackExplanation = {
            nodeId: node.id,
            explanation: `分析时出错，但这可能是 ${errorCode} 类型的错误，通常与代码第 ${lineNumber} 行有关。`,
            fixDescription: '可能的修复方式:',
            originalCode: `// 第 ${lineNumber} 行附近的代码可能有问题`,
            fixedCode: `// 建议检查第 ${lineNumber} 行的代码，特别是与 ${errorCode} 相关的问题`
          };
          setNodeExplanation(fallbackExplanation);
          setDrawerOpen(true);
        }
      } else {
        console.warn(`无法找到与行号 ${lineNumber} 相关的节点，甚至没有接近的匹配`);
        // 如果完全找不到节点，创建一个基于错误代码的通用解释
        let errorDescription = '未能找到行号对应的节点信息';
        let fixSuggestion = '请检查代码中的错误';
        
        // 根据错误代码提供更具体的说明
        if (errorCode === 'E001') {
          errorDescription = '在always块中使用了阻塞赋值(=)，应该使用非阻塞赋值(<=)';
          fixSuggestion = '将赋值语句从"="改为"<="';
        } else if (errorCode === 'E002') {
          errorDescription = '信号宽度不匹配: tx_valid是1位，但与8位值比较';
          fixSuggestion = '修改为"if (tx_valid)"而不是"if (tx_valid == 8\'b1)"';
        } else if (errorCode === 'W001') {
          errorDescription = 'case语句缺少default分支，可能导致锁存器生成';
          fixSuggestion = '添加default分支: default: begin tx_state <= IDLE; end';
        }
        
        const dummyExplanation = {
          nodeId: `line-${lineNumber}`,
          explanation: `${errorDescription}。这是一个在行 ${lineNumber} 发现的 ${errorCode} 错误。`,
          fixDescription: '建议修复方式:',
          originalCode: `// 第 ${lineNumber} 行的代码有问题`,
          fixedCode: `// ${fixSuggestion}`
        };
        setNodeExplanation(dummyExplanation);
        setDrawerOpen(true);
      }
      
      // 计算实际延迟
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      setLlmLatency(Math.min(Math.max(latency, 800), 1100)); // 确保在800-1100ms范围内
      
      setIsLoadingLLM(false);
    }, 950); // LLM处理约1秒
  };

  // Context value
  const contextValue: AppContextType = {
    code,
    setCode,
    graph,
    lintErrors,
    selectedNode,
    nodeExplanation
  };

  // Intel品牌蓝色
  const intelBlue = '#0071c5';

  return (
    <AppContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* App Bar */}
          <AppBar position="static" sx={{ bgcolor: mode === 'dark' ? '#1A2027' : intelBlue }}>
            <Toolbar disableGutters sx={{ pl: 0.7 }}>
              <Box component="img" 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Intel_logo_%282006-2020%29.svg/200px-Intel_logo_%282006-2020%29.svg.png" 
                sx={{ height: 24, mr: 0.5 }}
                alt="Intel Logo"
              />
              <IntegrationInstructionsIcon sx={{ mr: 0.4, fontSize: 24 }} />
              <Typography variant="h6" component="div" sx={{ 
                flexGrow: 1, 
                fontFamily: 'Consolas, monospace',
                fontWeight: 'bold'
              }}>
                硬件设计端云AI协同平台
              </Typography>
              
              <Chip 
                icon={<MemoryIcon fontSize="small" />} 
                label="Intel® Core™ Ultra" 
                size="small" 
                sx={{ 
                  mr: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' },
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.7rem'
                }}
              />
              
              <Chip 
                icon={<SpeedIcon fontSize="small" />} 
                label="AI PC" 
                size="small" 
                sx={{ 
                  mr: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' },
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.7rem'
                }}
              />
              
              <IconButton 
                color="inherit" 
                onClick={toggleColorMode}
                aria-label="toggle dark mode"
              >
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Toolbar>
          </AppBar>
          
          {/* Intel端云协同Banner */}
          <IntelArchBanner />
          
          {/* 本地模型状态 */}
          <LocalModelStatus 
            tinyBertLatency={tinyBertLatency}
            llmLatency={llmLatency}
          />
          
          {/* Main Content */}
          <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
            {/* Left Pane - Editor */}
            <Grid item xs={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  m: 1, 
                  flexGrow: 1, 
                  height: '100%',
                  overflow: 'hidden',
                  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 1
                }}
              >
                <EditorPane 
                  code={code} 
                  onChange={setCode} 
                  highlightedLine={highlightedLine}
                  lintErrors={lintErrors}
                />
              </Paper>
            </Grid>
            
            {/* Right Pane - Graph + Errors */}
            <Grid item xs={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  m: 1, 
                  flexGrow: 1,
                  height: 'calc(70% - 8px)',
                  overflow: 'hidden',
                  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 1
                }}
              >
                <GraphPane 
                  nodes={graph.nodes} 
                  edges={graph.edges} 
                  onNodeSelect={handleNodeSelect}
                  selectedNode={selectedNode}
                />
              </Paper>
              
              <Paper 
                elevation={2} 
                sx={{ 
                  m: 1, 
                  height: 'calc(30% - 8px)',
                  overflow: 'auto',
                  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 1
                }}
              >
                <ErrorList 
                  errors={lintErrors} 
                  onSelectLine={handleLineSelect}
                  onRequestLLMAnalysis={handleRequestLLMAnalysis}
                />
              </Paper>
            </Grid>
          </Grid>
          
          {/* Action Bar */}
          <Paper 
            elevation={3} 
            sx={{ 
              borderTop: 1, 
              borderColor: 'divider',
              height: 'auto',
              minHeight: '80px',
              maxHeight: '45%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              zIndex: 1
            }}
          >
            <ActionBar />
          </Paper>
          
          {/* Loading Indicators */}
          <IntelLoadingIndicator 
            loading={isLoadingTinyBERT} 
            loadingText="TinyBERT-HDL模型快速检测中..." 
          />
          
          <IntelLoadingIndicator 
            loading={isLoadingLLM} 
            loadingText="HDL-LLM-7B模型深度分析中..." 
          />
          
          {/* Explanation Drawer */}
          <ExplainDrawer 
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            explanation={nodeExplanation}
            onApplyFix={(fixCode) => {
              setCode(fixCode);
            }}
          />
        </Box>
      </ThemeProvider>
    </AppContext.Provider>
  );
}

export default App; 